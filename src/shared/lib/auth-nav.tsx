'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAccessToken, logout } from './auth';

/**
 * Ссылка «Войти» или кнопка «Выйти» в шапке.
 *
 * Состояние пересчитываем при смене маршрута: после входа и выхода
 * страница делает router.replace/refresh, pathname меняется — шапка
 * обновляется без отдельного хранилища.
 */
export function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSignedIn(getAccessToken() !== null);
  }, [pathname]);

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="ml-auto text-zinc-400 transition-colors hover:text-zinc-100"
      >
        Войти
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="ml-auto text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-50"
      onClick={() => {
        setPending(true);
        void logout().finally(() => {
          setSignedIn(false);
          setPending(false);
          router.replace('/');
          router.refresh();
        });
      }}
    >
      {pending ? 'Выходим…' : 'Выйти'}
    </button>
  );
}
