'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';
import { CheckIcon, CloseIcon, HooksterFace, WifiOffIcon } from '@/components/ui/icons';
import { StageBackdrop } from '@/features/game/stage-backdrop';
import { getFeed, isUnauthorized, type GameDto } from '@/shared/api/axios-instance';

/**
 * Выбор исходной игры для ремикса: лист поверх экрана с сеткой из GET /feed.
 * Отдельный ключ кэша (`['create','feed']`), потому что лента держит тот же
 * маршрут в useInfiniteQuery и другая форма данных сломала бы её кэш.
 *
 * Пустые и краевые состояния — по макету 08: в ленте нет игр, сеть отвалилась.
 */
export function GamePicker({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string;
  onSelect: (game: GameDto) => void;
  onClose: () => void;
}) {
  const feed = useQuery({
    queryKey: ['create', 'feed'],
    queryFn: () => getFeed({ category: 'for_you', limit: 24 }),
    retry: false,
    staleTime: 30_000,
  });

  // Esc закрывает лист: это оверлей, а не маршрут.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const games = feed.data?.games ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(6,6,3,0.72)] backdrop-blur-[6px] dt:items-center dt:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-picker-title"
        className="sheet-rise flex max-h-[92dvh] w-full max-w-[900px] flex-col overflow-hidden rounded-t-xl border border-line bg-page shadow-pop dt:rounded-xl"
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3.5 dt:px-6 dt:py-4">
          <h2
            id="game-picker-title"
            className="min-w-0 flex-1 font-display text-[18px] leading-[1.15] font-extrabold tracking-[-0.03em] text-ink dt:text-[20px]"
          >
            выбери исходную игру
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="закрыть"
            className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-hover text-ink transition-colors duration-150 hover:bg-hover-strong"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 dt:px-6 dt:py-5">
          {feed.isPending && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="aspect-[9/16] animate-pulse rounded-md bg-hover"
                />
              ))}
            </div>
          )}

          {feed.isError && isUnauthorized(feed.error) && (
            <PickerState
              icon="offline"
              title="нужно войти"
              text="лента в строгом режиме доступна после входа, а ремикс собирается из неё"
            >
              <Link
                href="/login?next=/create"
                className="inline-flex h-12 items-center rounded-pill bg-acid px-5 text-[15px] font-extrabold text-peel-900 transition-colors duration-150 hover:bg-acid-hi"
              >
                войти
              </Link>
            </PickerState>
          )}

          {feed.isError && !isUnauthorized(feed.error) && (
            <PickerState
              icon="offline"
              title="связь пропала"
              text="список игр не загрузился — проверь сеть и попробуй ещё раз"
            >
              <button
                type="button"
                onClick={() => void feed.refetch()}
                className="inline-flex h-12 items-center rounded-pill bg-acid px-5 text-[15px] font-extrabold text-peel-900 transition-colors duration-150 hover:bg-acid-hi"
              >
                попробовать снова
              </button>
            </PickerState>
          )}

          {!feed.isPending && !feed.isError && games.length === 0 && (
            <PickerState
              icon="mascot"
              title="здесь пока пусто"
              text="в ленте ещё нет игр, а ремикс собирается поверх чужой. Первая игра появится сразу после первой генерации — загляни в ленту"
            >
              <div className="flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/feed"
                  className="inline-flex h-12 items-center rounded-pill bg-acid px-5 text-[15px] font-extrabold text-peel-900 transition-colors duration-150 hover:bg-acid-hi"
                >
                  в ленту
                </Link>
                <button
                  type="button"
                  onClick={() => void feed.refetch()}
                  className="inline-flex h-12 items-center rounded-pill border-2 border-line-strong px-5 text-[14px] font-bold text-ink transition-colors duration-150 hover:border-acid hover:text-acid"
                >
                  обновить
                </button>
              </div>
            </PickerState>
          )}

          {games.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5">
              {games.map((game) => {
                const selected = game.gameId === selectedId;
                return (
                  <button
                    key={game.gameId}
                    type="button"
                    onClick={() => onSelect(game)}
                    aria-pressed={selected}
                    className={`relative aspect-[9/16] overflow-hidden rounded-md border-2 text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 active:scale-[0.97] ${
                      selected ? 'border-acid' : 'border-line hover:border-line-strong'
                    }`}
                  >
                    <StageBackdrop gameId={game.gameId} />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%]"
                      style={{
                        background:
                          'linear-gradient(to bottom, rgba(6,6,3,0) 0%, rgba(6,6,3,0.9) 100%)',
                      }}
                    />
                    {selected && (
                      <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-pill bg-acid text-peel-900">
                        <CheckIcon className="h-3.5 w-3.5" strokeWidth={3.5} />
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2.5">
                      <span className="scrim-text line-clamp-2 text-[13px] leading-[1.2] font-extrabold text-peel-25">
                        {game.title || 'без названия'}
                      </span>
                      <span className="truncate font-mono text-[10px] text-peel-300">
                        @{game.authorId.slice(0, 8)}
                        {game.genreTitles?.[0] ? ` · ${game.genreTitles[0]}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {feed.data?.nextCursor && (
            <p className="mt-4 text-center font-mono text-[11px] text-ink-mute">
              показаны первые {games.length} игр
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PickerState({
  icon,
  title,
  text,
  children,
}: {
  icon: 'mascot' | 'offline';
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5 px-4 py-10 text-center">
      {icon === 'mascot' ? (
        <span className="grid h-[76px] w-[76px] place-items-center rounded-pill bg-acid">
          <HooksterFace className="w-[57px] text-peel-900" />
        </span>
      ) : (
        <span className="grid h-[76px] w-[76px] place-items-center rounded-pill bg-[rgba(255,46,147,0.16)]">
          <WifiOffIcon className="h-[34px] w-[34px] text-hot" />
        </span>
      )}
      <div className="font-display text-[22px] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink">
        {title}
      </div>
      <p className="m-0 max-w-[42ch] text-[14px] leading-[1.5] font-medium text-ink-soft">
        {text}
      </p>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
