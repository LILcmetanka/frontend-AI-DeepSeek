'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, errorMessage } from '@/shared/api/axios-instance';

interface MeDto {
  id: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
}

export default function ProfilePage() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<MeDto>('/profile/me');
      return data;
    },
    retry: false,
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Профиль</h1>

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
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Логин</dt>
            <dd>{me.data.username ?? '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Имя</dt>
            <dd>{me.data.name ?? '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-28 text-zinc-400">Email</dt>
            <dd>{me.data.email ?? '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
