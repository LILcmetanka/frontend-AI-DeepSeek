'use client';

import type { GameDto } from '@/shared/api/axios-instance';

/**
 * Офлайн-игры (макет 08: «две игры сохранены офлайн»).
 *
 * Пакет игры (`index.js`, FU_0006) плеер и так тянет текстом и исполняет в
 * песочнице — значит, его можно сохранить вместе с карточкой и запустить
 * без сети. Спрайты не кэшируем: движок рисует примитивами, если картинка
 * не загрузилась (`templates/racing/index.js`, loadSprites).
 *
 * Храним localStorage, а не Cache API: запись маленькая (карточка + код),
 * нужен синхронный список для экрана «связь пропала», а Cache API —
 * асинхронный. Последние две игры: больше в макете нет, и памяти жалко.
 */

const STORAGE_KEY = 'hookster:offline-games-v1';
export const OFFLINE_GAMES_LIMIT = 2;

export interface OfflineGameEntry {
  game: GameDto;
  /** Код пакета (`index.js`) — ровно тот, что прошёл проверку целостности. */
  code: string;
  /** Когда сохранили, мс от эпохи: свежие сверху. */
  savedAt: number;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // Приватный режим/запрет хранилища: офлайн-режим просто выключен.
    return null;
  }
}

function isEntry(value: unknown): value is OfflineGameEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Partial<OfflineGameEntry>;
  const game = entry.game as Partial<GameDto> | undefined;
  return (
    Boolean(game) &&
    typeof game?.gameId === 'string' &&
    game.gameId.length > 0 &&
    typeof game.title === 'string' &&
    typeof entry.code === 'string' &&
    entry.code.length > 0 &&
    typeof entry.savedAt === 'number'
  );
}

/** Все сохранённые игры, свежие сверху. Битые записи молча выкидываем. */
export function listOfflineGames(): OfflineGameEntry[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, OFFLINE_GAMES_LIMIT);
  } catch {
    return [];
  }
}

export function readOfflineGame(gameId: string): OfflineGameEntry | null {
  return listOfflineGames().find((entry) => entry.game.gameId === gameId) ?? null;
}

/**
 * Сохраняет игру (или обновляет код уже сохранённой) и возвращает новый
 * список. Ошибку записи не пробрасываем: офлайн — приятный бонус, игра
 * важнее.
 */
export function saveOfflineGame(game: GameDto, code: string): OfflineGameEntry[] {
  const store = storage();
  if (!store || !code) return listOfflineGames();

  const entry: OfflineGameEntry = { game, code, savedAt: Date.now() };
  const rest = listOfflineGames().filter(
    (item) => item.game.gameId !== game.gameId,
  );
  const next = [entry, ...rest].slice(0, OFFLINE_GAMES_LIMIT);
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Переполнение квоты: оставляем как есть, офлайн просто не обновится.
  }
  return next;
}

export function dropOfflineGames(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Нечего удалять.
  }
}
