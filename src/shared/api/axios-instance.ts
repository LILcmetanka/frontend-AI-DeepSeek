import axios, { type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, refreshAccessToken } from "@/shared/lib/auth";

/**
 * Единственный axios-инстанс для всего приложения.
 *
 * База — NEXT_PUBLIC_API_URL (по умолчанию http://localhost:8080, шлюз).
 * Токен доступа берём из localStorage: refresh-куку ставит шлюз, а доступ
 * живёт в памяти вкладки — так проще, чем тащить cookie в SSR.
 *
 * withCredentials обязателен: без него браузер не отправит HttpOnly-куку
 * refresh_token на /auth/refresh и не примет Set-Cookie от шлюза.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  timeout: 15_000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Запрос, который уже пробовали повторить после refresh. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/** Методы входа: на их 401 обновлять нечего — это неверный код, а не сессия. */
function isAuthEndpoint(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("/auth/");
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // 401 один раз: обновляем access по куке и повторяем исходный запрос.
    // Если refresh не удался — отдаём исходную ошибку, а маршрут увезёт
    // пользователя на /login (RequireAuth).
    if (
      status !== 401 ||
      !config ||
      config._retry ||
      isAuthEndpoint(config.url)
    ) {
      return Promise.reject(error);
    }

    config._retry = true;

    const token = await refreshAccessToken();
    if (!token) return Promise.reject(error);

    config.headers.Authorization = `Bearer ${token}`;
    return api(config);
  },
);

export interface GameDto {
  gameId: string;
  templateId: string;
  authorId: string;
  title: string;
  description: string;
  codeUrl: string;
  codeIntegrity: string;
  engineMinVersion: string;
  config: string;
  genreTitles: string[] | null;
}

export interface TaskStatusDto {
  taskId: string;
  state: "PENDING" | "PROCESSING" | "SUCCESS" | "ERROR";
  gameId?: string;
  result?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ErrorDto {
  error?: { code?: string; message?: string };
}

export async function getGame(gameId: string): Promise<GameDto> {
  const { data } = await api.get<GameDto>(`/feed/${gameId}`);
  return data;
}

export type FeedCategory = "for_you" | "new" | "ai_picks";

export interface FeedPage {
  games: GameDto[];
  nextCursor: string;
}

export async function getFeed(params: {
  category: FeedCategory;
  cursor?: string;
  limit?: number;
}): Promise<FeedPage> {
  const { data } = await api.get<FeedPage>("/feed", {
    params: {
      category: params.category,
      cursor: params.cursor || undefined,
      limit: params.limit ?? 10,
    },
  });
  return {
    games: Array.isArray(data.games) ? data.games : [],
    nextCursor: data.nextCursor ?? "",
  };
}

export async function createTask(payload: {
  gameId: string;
  prompt: string;
  idempotencyKey?: string;
}): Promise<{ taskId: string }> {
  const { data } = await api.post<{ taskId: string }>("/generate", payload);
  return data;
}

export async function getTask(taskId: string): Promise<TaskStatusDto> {
  const { data } = await api.get<TaskStatusDto>(`/generate/${taskId}`);
  return data;
}

export async function sendEvent(payload: {
  userId: string;
  gameId: string;
  type: "view" | "play_start" | "play_finish" | "skip" | "like";
  durationSec?: number;
}): Promise<void> {
  await api.post("/events", payload);
}

/** Текст ошибки для человека: сообщение шлюза, иначе общая фраза. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ErrorDto>(error)) {
    const detail = error.response?.data?.error?.message;
    if (detail) {
      return detail;
    }
    if (error.response?.status === 501) {
      return "Лента пока недоступна: в контракте нет метода выдачи.";
    }
    return `Ошибка запроса (${error.response?.status ?? "сеть"})`;
  }
  return "Неизвестная ошибка";
}

/**
 * NF_015: состояние задачи — по-русски. Шлюз отдаёт машинные PENDING/
 * PROCESSING/SUCCESS/ERROR, подписи делает интерфейс.
 */
export function taskStateLabel(
  state: TaskStatusDto["state"] | undefined,
): string {
  switch (state) {
    case "PENDING":
      return "В очереди";
    case "PROCESSING":
      return "Генерируется";
    case "SUCCESS":
      return "Готово";
    case "ERROR":
      return "Ошибка";
    default:
      return "…";
  }
}

/**
 * NF_015: ошибка задачи по-русски. Текст оркестратора английский и
 * технический (правила Zod, коды апстримов) — показывать его пользователю
 * нельзя, поэтому переводим по `errorCode`, а не по сообщению.
 */
export function taskErrorMessage(
  code: string | undefined,
  message?: string,
): string {
  switch (code) {
    case "INVALID_INPUT":
      return "Запрос не прошёл проверку. Проверьте сообщение и игру.";
    case "MODERATION_REJECTED":
      return "Сообщение отклонено модерацией. Перефразируйте запрос.";
    case "IDEMPOTENCY_CONFLICT":
      return "Этот запрос уже отправлялся с другим содержимым. Поменяйте запрос.";
    case "TEMPLATE_NOT_FOUND":
      return "Шаблон игры не найден.";
    case "INVALID_MANIFEST":
      return "Шаблон игры повреждён: ИИ вернул неверную структуру.";
    case "AI_REFUSED":
      return "ИИ отказался менять игру. Попробуйте переформулировать.";
    case "CONFIG_SERVICE_FAILED":
    case "ASSET_SERVICE_FAILED":
    case "ASSET_GENERATOR_FAILED":
      return "Сервис генерации не справился. Попробуйте ещё раз.";
    case "SAVE_GAME_FAILED":
      return "Игра сгенерирована, но не сохранилась в ленте. Мы уже разбираемся.";
    case "TIMEOUT":
      return "Генерация заняла слишком много времени. Попробуйте ещё раз.";
    case "INTERNAL":
      return "Внутренняя ошибка генерации. Попробуйте позже.";
    default:
      // Кода нет — показываем общую фразу и код, если он есть.
      return message ? `Ошибка генерации (${message})` : "Ошибка генерации.";
  }
}
