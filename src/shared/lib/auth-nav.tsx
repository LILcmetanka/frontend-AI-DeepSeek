'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAccessToken, logout, onAuthChanged } from './auth';

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
    // Токен восстановили после refresh на защищённой странице — шапка
    // должна показать «Выйти», хотя getAccessToken() при первом рендере
    // ещё видел пусто.
    return onAuthChanged(() => setSignedIn(getAccessToken() !== null));
  }, [pathname]);

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="ml-auto text-ink-soft transition-colors hover:text-ink"
      >
        войти
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="ml-auto text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
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
      {pending ? 'выходим…' : 'выйти'}
    </button>
  );
}
