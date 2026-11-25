/**
 * Итог последней сессии — мост между экраном игры (запись) и экраном
 * результата (чтение).
 *
 * Сервер историю сеансов не отдаёт: `GET /stats` в metrics-service —
 * агрегаты по игре (число событий, среднее время), а не мои сессии.
 * Поэтому итог считаем сами и держим в sessionStorage: он живёт до закрытия
 * вкладки и не путается между вкладками.
 *
 * Чего нет, того нет: `score` появляется, только если движок прислал его
 * в событии (`play_finish`). Не пришёл — поле отсутствует, экран его скрывает.
 */

export interface SessionResult {
  gameId: string;
  title: string;
  authorId: string;
  /** Сколько длилась сессия по нашим часам, в секундах. */
  durationSec: number;
  /** Очки от движка, если он их прислал. */
  score?: number;
  /** Время окончания, мс с эпохи. */
  finishedAt: number;
}

const STORAGE_KEY = 'hookster:last-session';

export function saveSessionResult(result: SessionResult): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Приватный режим или переполненное хранилище: итог просто не сохранится.
  }
}

export function readSessionResult(): SessionResult | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const value = parsed as Partial<SessionResult>;
    if (
      typeof value.gameId !== 'string' ||
      value.gameId === '' ||
      typeof value.durationSec !== 'number' ||
      !Number.isFinite(value.durationSec)
    ) {
      return null;
    }
    return {
      gameId: value.gameId,
      title: typeof value.title === 'string' ? value.title : '',
      authorId: typeof value.authorId === 'string' ? value.authorId : '',
      durationSec: Math.max(0, Math.round(value.durationSec)),
      ...(typeof value.score === 'number' && Number.isFinite(value.score)
        ? { score: value.score }
        : {}),
      finishedAt:
        typeof value.finishedAt === 'number' && Number.isFinite(value.finishedAt)
          ? value.finishedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearSessionResult(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // см. saveSessionResult
  }
}

/** Секунды → «0:07», «1:05», «12:48». Часы не нужны: сессия не длиннее часа. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
