'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useCallback } from 'react';
import {
  errorMessage,
  sendEvent,
  type GameDto,
} from '@/shared/api/axios-instance';
import { getGameCached } from '@/shared/lib/game-cache';
import { GamePlayer, type PlayerEvent } from '@/shared/lib/game-player';

// Адреса вшиваются в бандл при сборке: это NEXT_PUBLIC_*, браузер ходит
// на хост, а не на имя контейнера.
const GAME_URL = (process.env.NEXT_PUBLIC_GAME_URL ?? '').trim();
const SPRITE_BASE_URL = (process.env.NEXT_PUBLIC_SPRITE_BASE_URL ?? '').trim();

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);

  // FU_0007: сначала локальная копия шаблона, на сервер — если её нет
  // или она устарела. Ключ тот же, что у prefetch в ленте.
  const game = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGameCached(gameId),
    retry: false,
  });

  const data: GameDto | undefined = game.data;

  const handlePlayerEvent = useCallback(
    (event: PlayerEvent) => {
      if (!data) return;
      // Метрики не должны ломать игру: ошибку отправки только пишем в консоль.
      void sendEvent({
        userId: data.authorId,
        gameId: data.gameId,
        type: event.type,
        durationSec: event.durationSec,
      }).catch((error: unknown) => {
        console.warn('Не удалось отправить событие игры:', error);
      });
    },
    [data],
  );

  if (game.isLoading) {
    return <p className="text-zinc-400">Загружаем игру…</p>;
  }

  if (game.isError || !data) {
    return (
      <section className="space-y-4">
        <p className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          {errorMessage(game.error)}
        </p>
        <Link href="/feed" className="text-emerald-400">
          ← назад к ленте
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.title || 'Игра'}</h1>
        {data.description && (
          <p className="mt-1 text-zinc-400">{data.description}</p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          шаблон {data.templateId} · версия движка {data.engineMinVersion}
        </p>
      </div>

      {GAME_URL ? (
        <GamePlayer
          onReady={(readyMs) => {
            // NF_0001: замер готовности виден в консоли; сравнение с порогом
            // 1000/3000 мс — по нему и проверяем ТЗ.
            console.info(`[NF_0001] игра готова за ${readyMs} мс`);
          }}
          gameId={data.gameId}
          userId={data.authorId}
          config={data.config}
          gameUrl={GAME_URL}
          // FU_0006: если в карточке пакет (index.js), плеер запускает его
          // в песочнице; встроенная сборка — запасной вариант.
          codeUrl={data.codeUrl}
          codeIntegrity={data.codeIntegrity}
          spriteBaseUrl={SPRITE_BASE_URL}
          engineMinVersion={data.engineMinVersion}
          onEvent={handlePlayerEvent}
        />
      ) : (
        <div className="rounded border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
          Плеер не настроен: не задан <code>NEXT_PUBLIC_GAME_URL</code>. Пока
          показываем пакет игры как есть, чтобы конфиг можно было проверить
          глазами.
        </div>
      )}

      <details className="rounded border border-zinc-800 p-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-300">
          Пакет игры
        </summary>
        <p className="mt-2 break-all text-xs text-zinc-500">{data.codeUrl}</p>
        <pre className="mt-2 max-h-80 overflow-auto rounded bg-zinc-900 p-3 text-xs text-emerald-200">
          {prettyJson(data.config)}
        </pre>
      </details>

      <button
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950"
        onClick={() => {
          void sendEvent({
            userId: data.authorId,
            gameId: data.gameId,
            type: 'like',
          });
        }}
      >
        Нравится
      </button>
    </section>
  );
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
