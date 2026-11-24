'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  errorMessage,
  getFeed,
  getGame,
  type FeedCategory,
  type GameDto,
} from '@/shared/api/axios-instance';

const CATEGORIES: Array<{ id: FeedCategory; label: string }> = [
  { id: 'for_you', label: 'Для вас' },
  { id: 'new', label: 'Новые' },
  { id: 'ai_picks', label: 'Выбор ИИ' },
];

/**
 * Лента: вертикальный список игр, следующая страница подгружается, когда
 * доходишь до конца. Это не полноэкранный свайп из ТЗ (CL_0001): подгрузка
 * есть, сам жест — отдельная задача.
 */
export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FeedCategory>('for_you');
  const [gameId, setGameId] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const feed = useInfiniteQuery({
    queryKey: ['feed', category],
    queryFn: ({ pageParam }) =>
      getFeed({ category, cursor: pageParam, limit: 10 }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    retry: false,
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feed;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && hasNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, category]);

  const games: GameDto[] = useMemo(
    () => feed.data?.pages.flatMap((page) => page.games) ?? [],
    [feed.data?.pages],
  );

  // NF_0002: клиент заранее загружает не менее двух следующих игр. Каждый
  // prefetch кладёт карточку в тот же ключ ['game', id], что читает страница
  // игры, поэтому переход открывается из кэша, без запроса. Грузим все
  // карточки текущей выдачи: их 10–20, а «следующие два» тогда есть от любой.
  const prefetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const game of games) {
      if (prefetchedRef.current.has(game.gameId)) continue;
      prefetchedRef.current.add(game.gameId);
      void queryClient.prefetchQuery({
        queryKey: ['game', game.gameId],
        queryFn: () => getGame(game.gameId),
        staleTime: 60_000,
      });
    }
  }, [games, queryClient]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Лента</h1>
        <div className="ml-auto flex gap-1 rounded border border-zinc-800 p-1 text-sm">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={
                item.id === category
                  ? 'rounded bg-emerald-500 px-3 py-1 font-medium text-zinc-950'
                  : 'rounded px-3 py-1 text-zinc-400 hover:text-zinc-100'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {feed.isLoading && <p className="text-zinc-400">Загружаем ленту…</p>}

      {feed.isError && (
        <div className="space-y-3">
          <p className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
            {errorMessage(feed.error)}
          </p>
          <button
            type="button"
            onClick={() => void feed.refetch()}
            className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
          >
            Повторить
          </button>
        </div>
      )}

      {!feed.isLoading && !feed.isError && games.length === 0 && (
        <p className="rounded border border-zinc-800 p-4 text-sm text-zinc-400">
          В этой категории пока пусто. Создайте игру в AI Studio — она
          появится здесь.
        </p>
      )}

      <ul className="space-y-4">
        {games.map((game) => (
          <li key={game.gameId}>
            <Link
              href={`/feed/${game.gameId}`}
              className="block rounded border border-zinc-800 p-4 transition-colors hover:border-emerald-600"
            >
              <h2 className="font-medium">{game.title || game.gameId}</h2>
              {game.description && (
                <p className="mt-1 text-sm text-zinc-400">{game.description}</p>
              )}
              <p className="mt-2 text-xs text-zinc-500">
                {(game.genreTitles ?? []).join(' · ') || 'без жанров'}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="h-8" />

      {isFetchingNextPage && (
        <p className="text-sm text-zinc-500">Подгружаем ещё…</p>
      )}

      <form
        className="flex flex-wrap items-end gap-3 border-t border-zinc-800 pt-6"
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
