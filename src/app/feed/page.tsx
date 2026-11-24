'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/shared/api/axios-instance';

interface FeedItem {
  gameId: string;
  title: string;
}

/**
 * Лента. Пока в контракте delivery нет GetFeed, шлюз отвечает 501 —
 * показываем это честно и даём открыть игру по id (например, из AI Studio).
 */
export default function FeedPage() {
  const router = useRouter();
  const [gameId, setGameId] = useState('');

  const feed = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data } = await api.get<{ items: FeedItem[] }>('/feed');
      return data;
    },
    retry: false,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Лента</h1>

      {feed.isError && (
        <p className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
          {errorMessage(feed.error)}
        </p>
      )}

      {feed.data?.items?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {feed.data.items.map((item) => (
            <li key={item.gameId}>
              <Link
                href={`/feed/${item.gameId}`}
                className="block rounded border border-zinc-800 p-4 hover:border-emerald-600"
              >
                {item.title || item.gameId}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (gameId.trim()) {
            router.push(`/feed/${gameId.trim()}`);
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Открыть игру по id</span>
          <input
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
            placeholder="UUID игры"
            className="w-80 rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </label>
        <button className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950">
          Открыть
        </button>
      </form>
    </section>
  );
}
