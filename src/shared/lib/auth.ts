'use client';

import axios from 'axios';

/**
 * Токены входа.
 *
 * Access-токен живёт в localStorage и уходит в Authorization. Refresh-токен
 * платформа в браузер не отдаёт: шлюз ставит HttpOnly-куку, поэтому
 * /auth/refresh вызывается с withCredentials, а не с телом запроса.
 *
 * Здесь намеренно голый axios, а не общий `api`: иначе 401-перехватчик
 * общего клиента рекурсивно дёргал бы refresh.
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(
  /\/+$/,
  '',
);
const TOKEN_KEY = 'accessToken';
const REFRESH_TIMEOUT_MS = 10_000;
/** Запас: токен, которому осталось меньше, считаем истёкшим. */
const EXPIRY_SKEW_SEC = 30;
/** Событие «токен появился/исчез»: шапка обновляется без перезагрузки. */
export const AUTH_CHANGED_EVENT = 'hookster:auth-changed';

function notifyAuthChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/** Подписка на смену входа: своё событие + storage из других вкладок. */
export function onAuthChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUTH_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Приватный режим/запрет storage: сессия проживёт до перезагрузки.
  }
  notifyAuthChanged();
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage недоступен — чистить нечего.
  }
  notifyAuthChanged();
}

interface JwtPayload {
  exp?: unknown;
}

/** Истёк ли access-токен. Не разобрали payload — считаем истёкшим. */
export function isTokenExpired(token: string, nowMs = Date.now()): boolean {
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return true;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as JwtPayload;
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return false;
    }
    return payload.exp * 1000 <= nowMs + EXPIRY_SKEW_SEC * 1000;
  } catch {
    return true;
  }
}

// Один refresh на все параллельные 401: иначе пять запросов обновят токен
// пять раз и затрут друг другу куку.
let refreshPromise: Promise<string | null> | null = null;

async function requestRefresh(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ access_token?: unknown }>(
      `${API_URL}/auth/refresh`,
      null,
      { withCredentials: true, timeout: REFRESH_TIMEOUT_MS },
    );
    const token = data?.access_token;
    if (typeof token === 'string' && token !== '') {
      setAccessToken(token);
      return token;
    }
  } catch {
    // Нет куки или она истекла — ниже чистим протухший access.
  }
  clearAccessToken();
  return null;
}

/** Обновляет access по refresh-куке. Параллельные вызовы ждут один запрос. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Живой access-токен: текущий, если не истёк, иначе после refresh. */
export async function ensureAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && !isTokenExpired(token)) return token;
  return refreshAccessToken();
}

/** Выход: шлюз гасит refresh-куку, клиент забывает access. */
export async function logout(): Promise<void> {
  try {
    await axios.post(`${API_URL}/auth/logout`, null, {
      withCredentials: true,
      timeout: REFRESH_TIMEOUT_MS,
    });
  } catch {
    // Кука могла уже истечь — локальный токен всё равно убираем.
  } finally {
    clearAccessToken();
  }
}
