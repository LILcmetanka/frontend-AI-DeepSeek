'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  errorMessage,
  getFeed,
  getGame,
  isUnauthorized,
  type FeedCategory,
  type GameDto,
} from '@/shared/api/axios-instance';

const CATEGORIES: Array<{ id: FeedCategory; label: string }> = [
  { id: 'for_you', label: 'Для вас' },
  { id: 'new', label: 'Новые' },
  { id: 'ai_picks', label: 'Выбор ИИ' },
];

/**
 * Лента мини-игр (CL_0001): полноэкранные карточки в лотке со снап-прокруткой.
 * На телефоне листается свайпом (нативный скролл + `scroll-snap`), на
 * десктопе — колесом, ↑/↓, PageUp/PageDown; Enter открывает активную карточку.
 * Следующая страница подгружается, когда доходишь до конца (NF_0002/CL_0001).
 */
export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FeedCategory>('for_you');
  const [gameId, setGameId] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLUListElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);

  const feed = useInfiniteQuery({
    queryKey: ['feed', category],
    queryFn: ({ pageParam }) =>
      getFeed({ category, cursor: pageParam, limit: 10 }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    retry: false,
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feed;

  const games: GameDto[] = useMemo(
    () => feed.data?.pages.flatMap((page) => page.games) ?? [],
    [feed.data?.pages],
  );

  // Новая категория — лента начинается сверху, а не с середины прошлой.
  useEffect(() => {
    setActiveIndex(0);
    railRef.current?.scrollTo({ top: 0 });
  }, [category]);

  // Какая карточка сейчас на экране: подсветка и индикатор позиции.
  useEffect(() => {
    const root = railRef.current;
    if (!root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      },
      { root, threshold: 0.6 },
    );
    for (const card of cardRefs.current) {
      if (card) observer.observe(card);
    }
    return () => observer.disconnect();
  }, [games.length]);

  // Подгрузка следующей страницы, когда дошли до конца лотка.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && hasNextPage) {
          void fetchNextPage();
        }
      },
      { root: railRef.current ?? undefined },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, category]);

  const scrollTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, games.length - 1));
      const card = cardRefs.current[clamped];
      if (!card) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      card.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      });
      setActiveIndex(clamped);
    },
    [games.length],
  );

  // Клавиатура: ↑/↓ и PageUp/PageDown листают, Enter открывает активную игру.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (games.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          event.preventDefault();
          scrollTo(activeIndex + 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          event.preventDefault();
          scrollTo(activeIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          scrollTo(0);
          break;
        case 'End':
          event.preventDefault();
          scrollTo(games.length - 1);
          break;
        case 'Enter': {
          const active = games[activeIndex];
          if (active) {
            event.preventDefault();
            router.push(`/feed/${active.gameId}`);
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, games, router, scrollTo]);

  // NF_0002: клиент заранее загружает следующие карточки. Каждый prefetch
  // кладёт карточку в тот же ключ ['game', id], что читает страница игры,
  // поэтому переход открывается из кэша, без запроса.
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold sm:text-2xl">Лента</h1>
        {games.length > 0 && (
          <span className="text-xs text-zinc-500" data-feed-position>
            {activeIndex + 1} / {games.length}
          </span>
        )}
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

      {feed.isError && isUnauthorized(feed.error) && (
        <div className="space-y-3">
          <p className="rounded border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-300">
            Лента в этом режиме доступна только после входа.
          </p>
          <Link
            href="/login?next=/feed"
            className="inline-block rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950"
          >
            Войти
          </Link>
        </div>
      )}

      {feed.isError && !isUnauthorized(feed.error) && (
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

      {games.length > 0 && (
        <ul
          ref={railRef}
          data-feed-rail
          className="flex max-h-[70dvh] snap-y snap-mandatory flex-col gap-3 overflow-y-auto overscroll-contain scroll-smooth rounded border border-zinc-900 bg-zinc-950/60 p-2 sm:max-h-[72dvh]"
          aria-label="Лента мини-игр"
        >
          {games.map((game, index) => (
            <li
              key={game.gameId}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              data-index={index}
              {...(index === activeIndex ? { 'aria-current': 'true' as const } : {})}
              className="snap-start snap-always shrink-0"
            >
              <Link
                href={`/feed/${game.gameId}`}
                className={`flex h-[64dvh] min-h-[18rem] flex-col justify-between rounded border p-4 transition-colors sm:p-6 ${
                  index === activeIndex
                    ? 'border-emerald-600 bg-zinc-900'
                    : 'border-zinc-800 bg-zinc-950 hover:border-emerald-600'
                }`}
              >
                <div>
                  <h2 className="text-lg font-semibold sm:text-2xl">
                    {game.title || game.gameId}
                  </h2>
                  {game.description && (
                    <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                      {game.description}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">
                    {(game.genreTitles ?? []).join(' · ') || 'без жанров'}
                  </p>
                  <p className="text-xs text-emerald-500">Открыть и играть →</p>
                </div>
              </Link>
            </li>
          ))}
          <li ref={(element) => {
            sentinelRef.current = element as unknown as HTMLDivElement | null;
          }} className="h-2 shrink-0" aria-hidden />
        </ul>
      )}

      {isFetchingNextPage && (
        <p className="text-sm text-zinc-500">Подгружаем ещё…</p>
      )}

      {games.length > 0 && (
        <p className="text-xs text-zinc-500">
          Листайте свайпом или ↑/↓, Enter — открыть игру.
        </p>
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
            className="w-full max-w-xs rounded border border-zinc-700 bg-zinc-900 px-3 py-2 sm:w-80"
          />
        </label>
        <button className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950">
          Открыть
        </button>
      </form>
    </section>
  );
}
