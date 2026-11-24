'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Плеер игры: SubwaySurf в iframe + мост postMessage.
 *
 * Игра присылает `hookster:ready`, платформа отвечает `hookster:mount`
 * с конфигом игры и базой спрайтов, дальше игра шлёт `hookster:event`
 * (play_start / play_finish / skip). Протокол — SubwaySurf/docs/EMBED.md.
 */

export type PlayEventType = 'play_start' | 'play_finish' | 'skip';

export interface PlayerEvent {
  type: PlayEventType;
  durationSec?: number;
  score?: number;
  distance?: number;
}

/**
 * Версия движка, вшитая в сборку плеера. Игру, которой нужен более новый
 * движок, не запускаем — иначе она упадёт непонятной ошибкой (NF_0010).
 * Меняется вместе с версией образа SubwaySurf.
 */
export const DEFAULT_ENGINE_VERSION =
  (process.env.NEXT_PUBLIC_ENGINE_VERSION ?? '1.0.0').trim() || '1.0.0';

const RUNNER_SOURCE = 'hookster-runner';
const PLATFORM_SOURCE = 'hookster-web';
const PLAY_EVENT_TYPES: readonly PlayEventType[] = [
  'play_start',
  'play_finish',
  'skip',
];

/** Сообщение игры наружу. Поля необязательные: набор зависит от события. */
interface RunnerMessage {
  source?: unknown;
  type?: unknown;
  event?: unknown;
  durationSec?: unknown;
  score?: unknown;
  distance?: unknown;
}

/** Проверка «это событие сеанса известного типа». */
export function isPlayerEvent(data: unknown): data is PlayerEvent {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const message = data as RunnerMessage;
  return (
    typeof message.event === 'string' &&
    (PLAY_EVENT_TYPES as readonly string[]).includes(message.event)
  );
}

/** Ограничение числа: в событие не должен уйти NaN или Infinity. */
function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Событие игры → PlayerEvent. Неизвестное/битое — null. */
export function toPlayerEvent(data: unknown): PlayerEvent | null {
  if (!isPlayerEvent(data)) return null;
  const message = data as RunnerMessage;
  return {
    type: message.event as PlayEventType,
    durationSec: finiteOrUndefined(message.durationSec),
    score: finiteOrUndefined(message.score),
    distance: finiteOrUndefined(message.distance),
  };
}

/** Конфиг игры в DTO приходит строкой JSON; битый — null (игра на дефолтах). */
export function parseGameConfig(raw: string): Record<string, unknown> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * NF_0010: конфиг игры помнит версию шаблона, а шаблон — минимальную версию
 * движка (`engine_min_version`). Сравниваем посегментно: версии в формате
 * `X.Y.Z`, строковое сравнение дало бы «1.10.0» < «1.9.0».
 *
 * Возвращает -1, 0, 1; null — версия не разобрана (тогда игру не блокируем).
 */
export function compareSemver(a: string, b: string): number | null {
  const parse = (value: string): number[] | null => {
    const parts = value.trim().replace(/^v/, '').split('.');
    if (parts.length === 0) return null;
    const numbers = parts.map((part) => Number.parseInt(part, 10));
    if (numbers.some((n) => !Number.isInteger(n) || n < 0)) return null;
    return numbers;
  };

  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return null;

  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }
  return 0;
}

/** Сможет ли движок версии `engineVersion` запустить игру (NF_0010). */
export function isEngineCompatible(
  engineVersion: string,
  engineMinVersion: string,
): boolean {
  if (!engineMinVersion) return true;
  const order = compareSemver(engineVersion, engineMinVersion);
  // Непонятная версия — не блокируем: пустой экран хуже попытки запуска.
  return order === null ? true : order >= 0;
}

/** Origin игры для postMessage: не отдаём mount всему интернету. */
export function messageTargetOrigin(gameUrl: string): string {
  try {
    return new URL(gameUrl).origin;
  } catch {
    return '*';
  }
}

/**
 * NF_0001: время от появления плеера на экране до готовности игры — не более
 * 1 с, если шаблон уже в кэше браузера, и не более 3 с при первой загрузке.
 * Замер снимаем здесь и отдаём наружу: странице — для лога/метрик, тесту —
 * через `data-ready-ms` на контейнере.
 */
export interface GamePlayerProps {
  gameId: string;
  userId: string;
  /** Конфиг игры строкой JSON — как в GameDto.config. */
  config: string;
  /** Адрес сборки SubwaySurf, например http://localhost:8081. */
  gameUrl: string;
  /** База S3/CDN для относительных путей спрайтов. */
  spriteBaseUrl?: string;
  /** Минимальная версия движка из карточки игры (NF_0010). */
  engineMinVersion?: string;
  /** Версия сборки движка, которую реально запускаем. */
  engineVersion?: string;
  onEvent: (event: PlayerEvent) => void;
  /** Вызывается один раз после `hookster:mount` с замером готовности. */
  onReady?: (readyMs: number) => void;
}

export function GamePlayer({
  gameId,
  userId,
  config,
  gameUrl,
  spriteBaseUrl,
  engineMinVersion,
  engineVersion = DEFAULT_ENGINE_VERSION,
  onEvent,
  onReady,
}: GamePlayerProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [readyMs, setReadyMs] = useState<number | null>(null);
  // Точка отсчёта — первый рендер плеера: «появление мини-игры на экране».
  const startedAtRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0,
  );
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  /** Снимает замер один раз; повторный ready (перезагрузка iframe) не считается. */
  const markReady = useCallback(() => {
    if (typeof performance === 'undefined') return;
    const elapsed = performance.now() - startedAtRef.current;
    setReadyMs((previous) => {
      if (previous !== null) return previous;
      try {
        const start = startedAtRef.current;
        performance.measure('hookster:game-ready', {
          start,
          end: start + elapsed,
        });
      } catch {
        // performance.measure не критичен: замер уже посчитан вручную.
      }
      onReadyRef.current?.(Math.round(elapsed));
      return Math.round(elapsed);
    });
  }, []);

  // Колбэк держим в ref: пересоздание функции страницы не должно
  // перевешивать обработчик message и слать mount заново.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const parsedConfig = useMemo(() => parseGameConfig(config), [config]);
  const compatible = useMemo(
    () => isEngineCompatible(engineVersion, engineMinVersion ?? ''),
    [engineVersion, engineMinVersion],
  );
  const targetOrigin = useMemo(() => messageTargetOrigin(gameUrl), [gameUrl]);

  const postMount = useCallback(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      {
        source: PLATFORM_SOURCE,
        type: 'hookster:mount',
        gameId,
        userId,
        spriteBaseUrl: spriteBaseUrl ?? '',
        config: parsedConfig,
      },
      targetOrigin,
    );
  }, [gameId, userId, spriteBaseUrl, parsedConfig, targetOrigin]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const frame = frameRef.current;
      // Только сообщения из нашего iframe: чужие окна игнорируем.
      if (!frame || event.source !== frame.contentWindow) return;

      const data: unknown = event.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      if ((data as RunnerMessage).source !== RUNNER_SOURCE) return;

      const type = (data as RunnerMessage).type;
      if (type === 'hookster:ready') {
        setReady(true);
        postMount();
        markReady();
        return;
      }
      if (type === 'hookster:event') {
        const parsed = toPlayerEvent(data);
        if (parsed) onEventRef.current(parsed);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [postMount, markReady]);

  // NF_0010: несовместимый шаблон — понятный отказ вместо пустого iframe.
  if (!compatible) {
    return (
      <div className="rounded border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-200">
        Игра собрана для более нового движка ({engineMinVersion}), а у нас{' '}
        {engineVersion}. Обновите страницу позже — мы обновляем движок.
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded border border-zinc-800 bg-black"
      data-ready-ms={readyMs ?? ''}
    >
      <iframe
        ref={frameRef}
        src={`${gameUrl}?embed=1&gameId=${encodeURIComponent(gameId)}&userId=${encodeURIComponent(userId)}`}
        title="Игра"
        className="h-[60vh] min-h-[320px] w-full sm:h-[70vh] sm:min-h-[420px]"
        onLoad={() => {
          // Страховка, если ready пришёл раньше, чем мы повесили обработчик.
          postMount();
        }}
      />
      {!ready && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
          Загружаем игру…
        </p>
      )}
    </div>
  );
}
