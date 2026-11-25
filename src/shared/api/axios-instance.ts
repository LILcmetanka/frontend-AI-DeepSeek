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

/** DT_0005: поля профиля, которые можно менять. */
export interface UpdateProfilePayload {
  username?: string;
  name?: string;
  birth_date?: string;
  avatar_url?: string;
}

/** GET /profile/me: профиль из токена. Пустые поля приходят как null. */
export interface ProfileDto {
  id: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
}

/** GET /account/: аккаунт авторизации — почта, телефон, подтверждения. */
export interface AccountDto {
  id?: string;
  phone?: string | null;
  email?: string | null;
  is_phone_verified?: boolean;
  is_email_verified?: boolean;
  role?: string | null;
}

export async function getMe(): Promise<ProfileDto> {
  const { data } = await api.get<ProfileDto>('/profile/me');
  return data;
}

export async function getAccount(): Promise<AccountDto> {
  const { data } = await api.get<AccountDto>('/account/');
  return data;
}

/**
 * DT_0005: частичное обновление профиля. Не переданное поле шлюз не меняет.
 * Пустое значение не шлём — контракт profile.v1 не умеет очищать поле.
 */
export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<void> {
  await api.patch("/profile/me", payload);
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

/** FU_0026: игры автора из токена — отдельный маршрут, а не лента. */
export async function getMyGames(params: {
  cursor?: string;
  limit?: number;
}): Promise<FeedPage> {
  const { data } = await api.get<FeedPage>('/profile/me/games', {
    params: {
      cursor: params.cursor || undefined,
      limit: params.limit ?? 10,
    },
  });
  return {
    games: Array.isArray(data.games) ? data.games : [],
    nextCursor: data.nextCursor ?? '',
  };
}

/**
 * FU_0028: id понравившихся игр. Шлюз отдаёт только id — карточки берём
 * по одной через getGame: список лайков живёт в profile-service, а игра —
 * в delivery.
 */
export async function getLikedGameIds(limit = 50): Promise<string[]> {
  const { data } = await api.get<string[] | null>('/likes', {
    params: { limit, offset: 0 },
  });
  return Array.isArray(data) ? data : [];
}

/**
 * FU_0028: поставить лайк. Шлюз отвечает 204 и счётчика не отдаёт —
 * поэтому в интерфейсе только состояние сердца, без числа.
 */
export async function addLike(gameId: string): Promise<void> {
  await api.post(`/likes/${gameId}`);
}

/** FU_0028: убрать лайк. Тоже 204 без тела. */
export async function removeLike(gameId: string): Promise<void> {
  await api.delete(`/likes/${gameId}`);
}

/** Карточки по id: битые/удалённые игры пропускаем, лента не должна падать. */
export async function getGamesByIds(ids: string[]): Promise<GameDto[]> {
  const results = await Promise.allSettled(ids.map((id) => getGame(id)));
  return results
    .filter(
      (result): result is PromiseFulfilledResult<GameDto> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value);
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
  // На закрытии вкладки обычный запрос браузер обрывает, и `skip` — событие,
  // которое шлётся ровно в этот момент, — до метрик не доходил.
  // sendBeacon переживает выгрузку страницы; авторизация ему не нужна:
  // /events публичный, а userId уже в теле (ADR-0014).
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function" &&
    typeof document !== "undefined" &&
    document.visibilityState === "hidden"
  ) {
    const url = new URL("/events", api.defaults.baseURL ?? window.location.origin);
    const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (navigator.sendBeacon(url, body)) {
      return;
    }
  }

  await api.post("/events", payload);
}

/** Текст ошибки для человека: сообщение шлюза, иначе общая фраза. */
/**
 * GW_0002 / ADR-0031: в строгом режиме лента и события требуют входа, и
 * анонимный запрос получает 401. Отличаем этот случай от поломки, чтобы
 * показать приглашение войти, а не техническую ошибку.
 */
export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/**
 * Сетевая ошибка: ответа нет вовсе (обрыв, DNS, офлайн) — в отличие от
 * ответа сервера с кодом. Макет 08 просит показывать такой случай как
 * «связь пропала», а не как техническую ошибку запроса.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return axios.isAxiosError(error) && !error.response;
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ErrorDto>(error)) {
    const detail = error.response?.data?.error?.message;
    if (detail) {
      return detail;
    }
    if (error.response?.status === 501) {
      return "лента пока недоступна: в контракте нет метода выдачи";
    }
    return `ошибка запроса (${error.response?.status ?? "сеть"})`;
  }
  return "неизвестная ошибка";
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
      return "генерируется";
    case "SUCCESS":
      return "готово";
    case "ERROR":
      return "ошибка";
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
      return "запрос не прошёл проверку. проверь сообщение и игру";
    case "MODERATION_REJECTED":
      return "сообщение отклонено модерацией. переформулируй запрос";
    case "IDEMPOTENCY_CONFLICT":
      return "этот запрос уже отправлялся с другим содержимым. поменяй запрос";
    case "TEMPLATE_NOT_FOUND":
      return "шаблон игры не найден";
    case "INVALID_MANIFEST":
      return "шаблон игры повреждён: ИИ вернул неверную структуру";
    case "AI_REFUSED":
      return "ИИ отказался менять игру. попробуй переформулировать";
    case "CONFIG_SERVICE_FAILED":
    case "ASSET_SERVICE_FAILED":
    case "ASSET_GENERATOR_FAILED":
      return "сервис генерации не справился. попробуй ещё раз";
    case "SAVE_GAME_FAILED":
      return "игра сгенерирована, но не сохранилась в ленте. уже разбираемся";
    case "TIMEOUT":
      return "генерация заняла слишком много времени. попробуй ещё раз";
    case "INTERNAL":
      return "внутренняя ошибка генерации. попробуй позже";
    default:
      // Кода нет — показываем общую фразу и код, если он есть.
      return message ? `ошибка генерации (${message})` : "ошибка генерации";
  }
}
