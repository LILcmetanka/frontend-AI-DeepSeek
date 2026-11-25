'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { WandIcon } from '@/components/ui/icons';
import { StageBackdrop } from '@/features/game/stage-backdrop';
import { getFeed, type GameDto } from '@/shared/api/axios-instance';

/**
 * Поиск и каталог — макет «04 Search / Catalog».
 *
 * Серверного поиска в API нет: `GET /feed` принимает только `category`,
 * `limit` и `cursor`. Поэтому каталог собирается на клиенте из трёх
 * категорий ленты (страницы по 50, потолок — 200 игр), а поиск и фильтр по
 * жанру работают по заголовку, описанию, автору и жанрам.
 *
 * Чего нет, того нет: «за сутки», «ремиксы», «до 30 секунд» и «новые авторы»
 * из макета не фильтруются — в карточке нет ни даты, ни признака ремикса,
 * ни длительности; просмотров в `GET /feed` тоже нет. Число игр показываем
 * найденное, а не «418» из макета.
 */

/** Потолок каталога: 4 страницы по 50 на каждую из трёх категорий. */
const MAX_GAMES = 200;
const PAGE_SIZE = 50;

async function loadCatalog(): Promise<GameDto[]> {
  const categories = ['for_you', 'new', 'ai_picks'] as const;
  const byId = new Map<string, GameDto>();

  for (const category of categories) {
    let cursor = '';
    for (let page = 0; page < 4 && byId.size < MAX_GAMES; page += 1) {
      const response = await getFeed({
        category,
        cursor: cursor || undefined,
        limit: PAGE_SIZE,
      });
      for (const game of response.games) {
        if (!byId.has(game.gameId)) byId.set(game.gameId, game);
      }
      if (!response.nextCursor || response.nextCursor === cursor) break;
      cursor = response.nextCursor;
    }
    if (byId.size >= MAX_GAMES) break;
  }

  return Array.from(byId.values());
}

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');

  const catalog = useQuery({
    queryKey: ['search', 'catalog'],
    queryFn: loadCatalog,
    retry: false,
    staleTime: 60_000,
  });

  const games = useMemo(() => catalog.data ?? [], [catalog.data]);

  // Жанры — только те, что реально пришли в карточках.
  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const game of games) {
      for (const title of game.genreTitles ?? []) set.add(title);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [games]);

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return games.filter((game) => {
      if (genre && !(game.genreTitles ?? []).includes(genre)) return false;
      if (!needle) return true;
      const haystack = [
        game.title,
        game.description,
        game.authorId,
        ...(game.genreTitles ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [games, genre, query]);

  const truncated = games.length >= MAX_GAMES;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none flex-col gap-3 border-b border-line px-4 py-3.5 dt:flex-row dt:items-center dt:px-10">
        <label className="relative flex w-full items-center dt:max-w-[520px] dt:flex-1">
          <span className="sr-only">поиск игр</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            aria-hidden
            className="pointer-events-none absolute left-[18px] h-[18px] w-[18px] text-ink-mute"
          >
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="игры, авторы, теги"
            className="w-full rounded-pill border border-line bg-raised py-3.5 pr-[18px] pl-[46px] font-mono text-[14px] text-ink transition-colors duration-150 placeholder:text-ink-mute hover:border-line-strong focus:border-lime-300 focus:shadow-[0_0_0_3px_rgba(198,255,46,0.25)] focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-ink-mute">
            {catalog.isLoading
              ? 'считаем игры…'
              : `${found.length} ${gamesWord(found.length)}`}
          </span>

          <Link
            href="/create"
            className="ml-auto inline-flex h-[46px] flex-none items-center gap-2 rounded-pill bg-acid px-5 text-[14px] font-extrabold text-peel-900 transition-[background,transform] duration-150 hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.94] dt:ml-0"
          >
            <WandIcon className="h-[19px] w-[19px]" />
            создать игру
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-24 dt:px-10">
        <div className="mb-4 flex flex-wrap gap-2">
          <GenreChip active={genre === ''} onClick={() => setGenre('')}>
            всё
          </GenreChip>
          {genres.map((title) => (
            <GenreChip
              key={title}
              active={genre === title}
              onClick={() => setGenre(genre === title ? '' : title)}
            >
              {title}
            </GenreChip>
          ))}
        </div>

        {catalog.isLoading && (
          <p className="font-mono text-[13px] text-ink-mute">Собираем каталог…</p>
        )}

        {catalog.isError && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-bold text-ink">
              Каталог не загрузился: сервер не ответил
            </p>
            <button
              type="button"
              onClick={() => void catalog.refetch()}
              className="rounded-pill border-2 border-line-strong px-5 py-2.5 text-[14px] font-bold text-ink transition-colors hover:border-acid hover:text-acid"
            >
              повторить
            </button>
          </div>
        )}

        {!catalog.isLoading && !catalog.isError && found.length === 0 && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[15px] font-bold text-ink">Ничего не нашлось</p>
            <p className="text-[14px] leading-[1.5] text-ink-soft">
              {query.trim() || genre
                ? 'Попробуйте другой запрос или сбросьте фильтр жанра.'
                : 'В каталоге пока нет игр — создайте первую в AI Studio.'}
            </p>
            {(query.trim() !== '' || genre !== '') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setGenre('');
                }}
                className="rounded-pill border-2 border-line-strong px-5 py-2.5 text-[14px] font-bold text-ink transition-colors hover:border-acid hover:text-acid"
              >
                сбросить
              </button>
            )}
          </div>
        )}

        {found.length > 0 && (
          <ul className="grid grid-cols-2 gap-3.5 dt:grid-cols-5">
            {found.map((game) => (
              <li key={game.gameId}>
                <SearchCard game={game} />
              </li>
            ))}
          </ul>
        )}

        {!catalog.isLoading && !catalog.isError && (
          <p className="mt-5 font-mono text-[11px] leading-[1.6] text-ink-mute">
            Поиск идёт по {games.length}
            {truncated ? '+' : ''} загруженным играм каталога: серверного поиска
            в API нет. Просмотры и метки «за сутки» в карточке не отдаются,
            поэтому фильтров по ним нет.
          </p>
        )}
      </div>
    </div>
  );
}

function GenreChip({
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
      className={`rounded-pill px-3.5 py-[9px] font-mono text-[12px] transition-[background,color,transform] duration-150 active:scale-[0.96] ${
        active
          ? 'bg-lime-300 font-bold text-peel-900'
          : 'bg-hover text-ink-soft hover:bg-hover-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function SearchCard({ game }: { game: GameDto }) {
  const title = game.title || 'без названия';
  const genre = game.genreTitles?.[0];

  return (
    <Link
      href={`/feed/${game.gameId}`}
      className="group relative block aspect-[9/16] overflow-hidden rounded-lg bg-peel-950 shadow-[inset_0_0_0_1px_var(--color-line)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[inset_0_0_0_2px_var(--color-lime-300)]"
    >
      <StageBackdrop gameId={game.gameId} />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,6,3,0) 0%, rgba(6,6,3,0.55) 50%, rgba(6,6,3,0.93) 100%)',
        }}
      />

      {genre && (
        <span className="absolute top-2.5 left-2.5 rounded-pill bg-[rgba(6,6,3,0.6)] px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em] text-peel-100 uppercase">
          {genre}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[7px] p-3">
        <div className="scrim-text line-clamp-2 font-display text-[14px] leading-[1.15] font-extrabold tracking-[-0.02em] text-peel-25">
          {title}
        </div>
        <div className="scrim-text truncate font-mono text-[11px] font-bold text-peel-100">
          @{game.authorId.slice(0, 8)}
        </div>
      </div>
    </Link>
  );
}

/** «1 игра», «2 игры», «5 игр» — иначе счётчик читается как машинный. */
function gamesWord(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return 'игр';
  switch (count % 10) {
    case 1:
      return 'игра';
    case 2:
    case 3:
    case 4:
      return 'игры';
    default:
      return 'игр';
  }
}
