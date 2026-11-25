'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HooksterMark,
} from '@/components/ui/icons';
import { GameCard } from '@/features/game/game-card';
import {
  addLike,
  errorMessage,
  getFeed,
  getGame,
  getLikedGameIds,
  isUnauthorized,
  removeLike,
  type GameDto,
} from '@/shared/api/axios-instance';
import { getAccessToken } from '@/shared/lib/auth';
import { useSignedIn } from '@/shared/lib/use-signed-in';

/**
 * Лента как в макете «Главная · лента»: одна игра на весь экран,
 * вертикальный snap-скролл, табы «подписки | рекомендации», оверлеи
 * на карточке, прогресс точками слева.
 *
 * Колесо и свайп работают нативно (snap-y mandatory), стрелки и ↑/↓
 * листают по одной карточке, Enter открывает активную игру.
 * Гость получает публичную выдачу из 20 игр (ADR-0014), вход — по /login.
 */

type Tab = 'rec' | 'sub';

/** Гостю — 20 популярных (категория по умолчанию), вошедшему — короче. */
const GUEST_LIMIT = 20;
const USER_LIMIT = 10;

export function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signedIn = useSignedIn();
  const [tab, setTab] = useState<Tab>('rec');
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const railRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const feed = useInfiniteQuery({
    queryKey: ['feed', 'for_you'],
    queryFn: ({ pageParam }) =>
      getFeed({
        category: 'for_you',
        cursor: pageParam,
        limit: getAccessToken() ? USER_LIMIT : GUEST_LIMIT,
      }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    retry: false,
    enabled: tab === 'rec',
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feed;

  const games: GameDto[] = useMemo(
    () => feed.data?.pages.flatMap((page) => page.games) ?? [],
    [feed.data?.pages],
  );

  /* ---------- лайки ---------- */
  // Шлюз отдаёт только id понравившихся и 204 на POST/DELETE, поэтому
  // состояние сердца берём из GET /likes, а число не рисуем вовсе.
  const likesQuery = useQuery({
    queryKey: ['likes'],
    queryFn: () => getLikedGameIds(100),
    enabled: signedIn,
    retry: false,
    staleTime: 60_000,
  });

  const likedIds = useMemo(
    () => new Set(likesQuery.data ?? []),
    [likesQuery.data],
  );

  const likeMutation = useMutation({
    mutationFn: async ({
      gameId,
      next,
    }: {
      gameId: string;
      next: boolean;
    }): Promise<void> => {
      if (next) {
        await addLike(gameId);
        return;
      }
      await removeLike(gameId);
    },
    onMutate: async ({ gameId, next }) => {
      await queryClient.cancelQueries({ queryKey: ['likes'] });
      const previous = queryClient.getQueryData<string[]>(['likes']) ?? [];
      queryClient.setQueryData<string[]>(
        ['likes'],
        next
          ? Array.from(new Set([...previous, gameId]))
          : previous.filter((id) => id !== gameId),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context) queryClient.setQueryData(['likes'], context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
    },
  });

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2300);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  /* ---------- навигация по ленте ---------- */
  const goTo = useCallback(
    (index: number) => {
      const rail = railRef.current;
      if (!rail || games.length === 0) return;
      const clamped = Math.max(0, Math.min(index, games.length - 1));
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      rail.scrollTo({
        top: clamped * rail.clientHeight,
        behavior: reduced ? 'auto' : 'smooth',
      });
      setActiveIndex(clamped);
    },
    [games.length],
  );

  const handleScroll = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const height = Math.max(1, rail.clientHeight);
    const index = Math.round(rail.scrollTop / height);
    setActiveIndex((current) => (current === index ? current : index));
  }, []);

  // Другая вкладка — лента начинается сверху, а не с середины прошлой.
  useEffect(() => {
    setActiveIndex(0);
    railRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  // Догрузка следующей страницы заранее: пока листаешь последние карточки.
  useEffect(() => {
    if (tab !== 'rec') return;
    if (!hasNextPage || isFetchingNextPage || games.length === 0) return;
    if (activeIndex >= games.length - 2) void fetchNextPage();
  }, [activeIndex, games.length, hasNextPage, isFetchingNextPage, fetchNextPage, tab]);

  // NF_0002: карточка игры кладётся в кэш, чтобы /feed/{id} открывалась сразу.
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (games.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          event.preventDefault();
          goTo(activeIndex + 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          event.preventDefault();
          goTo(activeIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          goTo(0);
          break;
        case 'End':
          event.preventDefault();
          goTo(games.length - 1);
          break;
        case 'Enter': {
          // Enter на кнопке/ссылке принадлежит ей, а не ленте.
          if (target?.closest('a, button')) return;
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
  }, [activeIndex, games, router, goTo]);

  function handleLike(gameId: string): void {
    if (!signedIn) {
      router.push('/login?next=/feed');
      return;
    }
    likeMutation.mutate({ gameId, next: !likedIds.has(gameId) });
  }

  const showCards = tab === 'rec' && games.length > 0;

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-stage dt:p-6">
      <div className="feed-frame">
        <div
          ref={railRef}
          data-feed-rail
          aria-label="Лента мини-игр"
          onScroll={handleScroll}
          className="feed-rail absolute inset-0 snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
        >
          {showCards &&
            games.map((game, index) => (
              <div
                key={game.gameId}
                data-index={index}
                {...(index === activeIndex
                  ? { 'aria-current': 'true' as const }
                  : {})}
                className="h-full w-full snap-start snap-always"
              >
                <GameCard
                  game={game}
                  liked={likedIds.has(game.gameId)}
                  onLike={() => handleLike(game.gameId)}
                  onNotify={notify}
                />
              </div>
            ))}
        </div>

        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[58px] items-center gap-3 px-3.5">
          <Link
            href="/feed"
            className="pointer-events-auto flex flex-none items-center gap-2 dt:hidden"
          >
            <HooksterMark className="h-[26px] w-[26px] text-acid" />
            <span className="scrim-text font-display text-[19px] leading-none font-black tracking-[-0.045em] text-peel-25 max-[419px]:hidden">
              hookster
            </span>
          </Link>
          <nav className="pointer-events-auto ml-auto flex items-end gap-[18px]">
            <TabButton active={tab === 'sub'} onClick={() => setTab('sub')}>
              подписки
            </TabButton>
            <TabButton active={tab === 'rec'} onClick={() => setTab('rec')}>
              рекомендации
            </TabButton>
          </nav>
        </header>

        {showCards && (
          <div className="pointer-events-none absolute top-1/2 left-[7px] z-20 flex -translate-y-1/2 flex-col gap-[5px]">
            {games.map((game, index) => (
              <span
                key={game.gameId}
                className={
                  index === activeIndex
                    ? 'block h-5 w-[3px] rounded-pill bg-acid'
                    : 'block h-[9px] w-[3px] rounded-pill bg-[rgba(242,242,232,0.34)]'
                }
              />
            ))}
          </div>
        )}

        {/* Индикатор позиции для скринридеров и проверок CL_0001. */}
        {showCards && (
          <span className="sr-only" data-feed-position>
            {activeIndex + 1} / {games.length}
          </span>
        )}

        {tab === 'sub' && (
          <FrameMessage title="Подписки пока недоступны">
            В API нет списка авторов и подписок — лента собрана только из
            рекомендаций.
            <button
              type="button"
              onClick={() => setTab('rec')}
              className="mt-4 rounded-pill bg-acid px-5 py-2.5 text-[14px] font-extrabold text-peel-900 transition-colors hover:bg-acid-hi"
            >
              смотреть рекомендации
            </button>
          </FrameMessage>
        )}

        {tab === 'rec' && feed.isLoading && (
          <FrameMessage title="Загружаем ленту…" />
        )}

        {tab === 'rec' && feed.isError && isUnauthorized(feed.error) && (
          <FrameMessage title="Лента в этом режиме доступна после входа">
            <Link
              href="/login?next=/feed"
              className="mt-4 inline-block rounded-pill bg-acid px-5 py-2.5 text-[14px] font-extrabold text-peel-900 transition-colors hover:bg-acid-hi"
            >
              войти
            </Link>
          </FrameMessage>
        )}

        {tab === 'rec' && feed.isError && !isUnauthorized(feed.error) && (
          <FrameMessage title={errorMessage(feed.error)}>
            <button
              type="button"
              onClick={() => void feed.refetch()}
              className="mt-4 rounded-pill border-2 border-line-strong px-5 py-2.5 text-[14px] font-bold text-ink transition-colors hover:border-acid hover:text-acid"
            >
              повторить
            </button>
          </FrameMessage>
        )}

        {tab === 'rec' && !feed.isLoading && !feed.isError && games.length === 0 && (
          <FrameMessage title="В ленте пока пусто">
            Создайте игру в AI Studio — она появится здесь.
            <Link
              href="/create"
              className="mt-4 inline-block rounded-pill bg-acid px-5 py-2.5 text-[14px] font-extrabold text-peel-900 transition-colors hover:bg-acid-hi"
            >
              открыть AI Studio
            </Link>
          </FrameMessage>
        )}

        {toast && (
          <div className="animate-toast absolute top-[68px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-peel-25 px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-peel-900 shadow-pop">
            <CheckIcon className="h-4 w-4 text-lime-600" />
            {toast}
          </div>
        )}
      </div>

      <div className="ml-4 hidden flex-none flex-col gap-2.5 dt:flex">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="предыдущая игра"
          className="grid h-[46px] w-[46px] place-items-center rounded-pill bg-hover text-ink transition-[background,transform] duration-150 hover:-translate-y-0.5 hover:bg-hover-strong active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronUpIcon className="h-[22px] w-[22px]" />
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex >= games.length - 1}
          aria-label="следующая игра"
          className="grid h-[46px] w-[46px] place-items-center rounded-pill bg-hover text-ink transition-[background,transform] duration-150 hover:-translate-y-0.5 hover:bg-hover-strong active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronDownIcon className="h-[22px] w-[22px]" />
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`scrim-text border-b-[3px] px-px pb-[7px] text-[15px] transition-colors duration-150 ${
        active
          ? 'border-acid font-extrabold text-peel-25'
          : 'border-transparent font-bold text-[rgba(242,242,232,0.6)] hover:text-peel-25'
      }`}
    >
      {children}
    </button>
  );
}

function FrameMessage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center px-8 text-center">
      <div className="flex max-w-[320px] flex-col items-center">
        <p className="text-[17px] leading-[1.35] font-bold text-ink">{title}</p>
        {children && (
          <div className="mt-2 text-[14px] leading-[1.5] text-ink-soft">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
