import axios from 'axios';

/**
 * Единственный axios-инстанс для всего приложения.
 *
 * База — NEXT_PUBLIC_API_URL (по умолчанию http://localhost:8080, шлюз).
 * Токен доступа берём из localStorage: refresh-куку ставит шлюз, а доступ
 * живёт в памяти вкладки — так проще, чем тащить cookie в SSR.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

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
  state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';
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

export async function createTask(payload: {
  gameId: string;
  prompt: string;
  idempotencyKey?: string;
}): Promise<{ taskId: string }> {
  const { data } = await api.post<{ taskId: string }>('/generate', payload);
  return data;
}

export async function getTask(taskId: string): Promise<TaskStatusDto> {
  const { data } = await api.get<TaskStatusDto>(`/generate/${taskId}`);
  return data;
}

export async function sendEvent(payload: {
  userId: string;
  gameId: string;
  type: 'view' | 'play_start' | 'play_finish' | 'skip' | 'like';
  durationSec?: number;
}): Promise<void> {
  await api.post('/events', payload);
}

/** Текст ошибки для человека: сообщение шлюза, иначе общая фраза. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ErrorDto>(error)) {
    const detail = error.response?.data?.error?.message;
    if (detail) {
      return detail;
    }
    if (error.response?.status === 501) {
      return 'Лента пока недоступна: в контракте нет метода выдачи.';
    }
    return `Ошибка запроса (${error.response?.status ?? 'сеть'})`;
  }
  return 'Неизвестная ошибка';
}
