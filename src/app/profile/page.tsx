'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import {
  api,
  errorMessage,
  getGamesByIds,
  getLikedGameIds,
  getMyGames,
  type GameDto,
} from '@/shared/api/axios-instance';
import { RequireAuth } from '@/shared/lib/require-auth';
import { ProfileForm } from './profile-form';

interface MeDto {
  id: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
}

/** Вкладки профиля: FU_0026 «Мои игры», FU_0028 «Понравившиеся». */
type Tab = 'mine' | 'liked';

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const [tab, setTab] = useState<Tab>('mine');
  const [editing, setEditing] = useState(false);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<MeDto>('/profile/me');
      return data;
    },
    retry: false,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold sm:text-2xl">Профиль</h1>

      {me.isLoading && <p className="text-zinc-400">Загружаем…</p>}

      {me.isError && (
        <div className="space-y-3">
          <p className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
            {errorMessage(me.error)}
          </p>
          <Link className="text-emerald-400" href="/login">
            Войти по коду
          </Link>
        </div>
      )}

      {me.data && (
        <dl className="space-y-2 text-sm">
          {me.data.avatar_url && (
            <div className="flex items-center gap-3">
              <dt className="w-28 text-zinc-400">Аватар</dt>
              {/* eslint-disable-next-line @next/next/no-img-element -- ссылка приходит из профиля, домены заранее неизвестны */}
              <img
                src={me.data.avatar_url}
                alt="Аватар"
                className="h-12 w-12 rounded-full border border-zinc-700 object-cover"
              />
            </div>
          )}
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Логин</dt>
            <dd>{me.data.username ?? '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Имя</dt>
            <dd>{me.data.name ?? '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Дата рождения</dt>
            <dd>{me.data.birth_date ?? '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Email</dt>
            <dd>{me.data.email ?? '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Телефон</dt>
            <dd>{me.data.phone ?? '—'}</dd>
          </div>
        </dl>
      )}

      {me.data && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-200"
            aria-expanded={editing}
          >
            {editing ? 'Свернуть' : 'Редактировать профиль'}
          </button>
          {editing && (
            <ProfileForm profile={me.data} />
          )}
        </div>
      )}

      <div className="flex gap-2" role="tablist">
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
          Мои игры
        </TabButton>
        <TabButton active={tab === 'liked'} onClick={() => setTab('liked')}>
          Понравившиеся
        </TabButton>
      </div>

      {tab === 'mine' ? <MyGames /> : <LikedGames />}
    </section>
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'rounded bg-emerald-500 px-3 py-1 text-sm font-medium text-zinc-950'
          : 'rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300'
      }
    >
      {children}
    </button>
  );
}

function GameList({
  games,
  empty,
}: {
  games: GameDto[];
  empty: string;
}) {
  if (games.length === 0) {
    return <p className="text-sm text-zinc-400">{empty}</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {games.map((game) => (
        <li
          key={game.gameId}
          className="rounded border border-zinc-800 p-3 text-sm"
        >
          <Link className="font-medium text-emerald-400" href={`/feed/${game.gameId}`}>
            {game.title}
          </Link>
          <p className="mt-1 line-clamp-2 text-zinc-400">{game.description}</p>
          {game.genreTitles && game.genreTitles.length > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              {game.genreTitles.join(' · ')}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** FU_0026: игры, созданные этим пользователем (GET /profile/me/games). */
function MyGames() {
  const query = useQuery({
    queryKey: ['my-games'],
    queryFn: () => getMyGames({ limit: 20 }),
  });

  if (query.isLoading) return <p className="text-sm text-zinc-400">Загружаем…</p>;
  if (query.isError) {
    return (
      <p className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
        {errorMessage(query.error)}
      </p>
    );
  }

  return (
    <GameList
      games={query.data?.games ?? []}
      empty="Вы ещё ничего не создали. Начните с ленты: откройте игру и нажмите «Изменить»."
    />
  );
}

/** FU_0028: лента из игр, отмеченных пользователем. */
function LikedGames() {
  const query = useQuery({
    queryKey: ['liked-games'],
    queryFn: async () => getGamesByIds(await getLikedGameIds(50)),
  });

  if (query.isLoading) return <p className="text-sm text-zinc-400">Загружаем…</p>;
  if (query.isError) {
    return (
      <p className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
        {errorMessage(query.error)}
      </p>
    );
  }

  return (
    <GameList
      games={query.data ?? []}
      empty="Пока ничего не понравилось. Отмечайте игры в ленте — они появятся здесь."
    />
  );
}
