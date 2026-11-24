import { getGame, type GameDto } from '@/shared/api/axios-instance';

/**
 * FU_0007, CL_0002: локальный кэш шаблона игры.
 *
 * Шаблон механики для платформы — карточка игры (`/feed/{gameId}`): конфиг,
 * версия шаблона и адрес сборки движка. Карточка маленькая, но именно она
 * определяет, что игрок увидит на экране. Храним её в Cache API: сначала
 * смотрим локальную копию, на сервер идём, только если копии нет или она
 * устарела (см. FRESH_MS) либо сменилась версия шаблона (NF_0010).
 */

const CACHE_NAME = 'hookster-templates-v1';

/** Сколько локальная копия считается свежей: в этом окне сети нет вообще. */
export const FRESH_MS = 5 * 60 * 1000;

/** Синтетический адрес ключа: Cache API требует URL, а не id. */
function cacheKey(gameId: string): string {
  return `https://hookster.local/feed/${encodeURIComponent(gameId)}`;
}

export interface CachedTemplate {
  game: GameDto;
  /** Когда карточку положили в кэш (мс от эпохи). */
  fetchedAt: number;
  /** Версия шаблона из конфига игры — по ней понимаем, что копия устарела. */
  templateVersion: string;
}

/** Версия шаблона из конфига; пустая — версия не указана. */
export function templateVersionOf(game: GameDto): string {
  try {
    const config: unknown = JSON.parse(game.config);
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      const version = (config as Record<string, unknown>).templateVersion;
      return typeof version === 'string' ? version : '';
    }
  } catch {
    // Битый конфиг — версии нет; кэш всё равно пригоден.
  }
  return '';
}

function cacheStorageAvailable(): boolean {
  return typeof caches !== 'undefined';
}

/** Читает локальную копию; null — копии нет или она битая. */
export async function readCachedTemplate(
  gameId: string,
): Promise<CachedTemplate | null> {
  if (!cacheStorageAvailable()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheKey(gameId));
    if (!response) return null;
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== 'object') return null;
    const entry = parsed as CachedTemplate;
    if (!entry.game || typeof entry.fetchedAt !== 'number') return null;
    return entry;
  } catch {
    // Приватный режим/переполнение квоты: кэш — оптимизация, не источник правды.
    return null;
  }
}

async function writeCachedTemplate(game: GameDto): Promise<void> {
  if (!cacheStorageAvailable()) return;
  const entry: CachedTemplate = {
    game,
    fetchedAt: Date.now(),
    templateVersion: templateVersionOf(game),
  };
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      cacheKey(game.gameId),
      new Response(JSON.stringify(entry), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  } catch {
    // Не сохранилось — следующий раз просто сходим на сервер.
  }
}

/**
 * Карточка игры с локального кэша (FU_0007). На сервер идём, только если
 * копии нет, она старше `freshMs` или у сервера другая версия шаблона
 * (NF_0010: старые игры должны открываться на новой версии шаблона).
 */
export async function getGameCached(
  gameId: string,
  freshMs = FRESH_MS,
): Promise<GameDto> {
  const cached = await readCachedTemplate(gameId);
  if (cached && Date.now() - cached.fetchedAt < freshMs) {
    return cached.game;
  }

  const fresh = await getGame(gameId);

  if (cached && cached.templateVersion === templateVersionOf(fresh)) {
    // Версия та же — обновляем отметку времени, содержимое не меняем.
    await writeCachedTemplate(fresh);
    return cached.game;
  }

  await writeCachedTemplate(fresh);
  return fresh;
}

/** Сброс кэша: нужен после генерации новой версии игры. */
export async function dropCachedTemplate(gameId: string): Promise<void> {
  if (!cacheStorageAvailable()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheKey(gameId));
  } catch {
    // Нечего удалять или кэш недоступен.
  }
}
