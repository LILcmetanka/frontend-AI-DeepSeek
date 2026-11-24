'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { use } from 'react';
import {
  errorMessage,
  getGame,
  sendEvent,
  type GameDto,
} from '@/shared/api/axios-instance';

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);

  const game = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGame(gameId),
    retry: false,
  });

  if (game.isLoading) {
    return <p className="text-zinc-400">Загружаем игру…</p>;
  }

  if (game.isError || !game.data) {
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

  const data: GameDto = game.data;

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

      {/*
        Плеер появится вместе с SubwaySurf: в конфиге игры лежат пути спрайтов,
        а движок тянет их из S3. Пока показываем пакет игры как есть, чтобы
        конфиг можно было проверить глазами.
      */}
      <div className="rounded border border-zinc-800 p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-300">Пакет игры</h2>
        <p className="mb-2 break-all text-xs text-zinc-500">{data.codeUrl}</p>
        <pre className="max-h-80 overflow-auto rounded bg-zinc-900 p-3 text-xs text-emerald-200">
          {prettyJson(data.config)}
        </pre>
      </div>

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
