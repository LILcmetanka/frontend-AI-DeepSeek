'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ensureAccessToken } from './auth';

/**
 * Защита маршрута: пускает только со живым access-токеном.
 *
 * Если access истёк, сначала пробуем refresh по HttpOnly-куке — так
 * перезагрузка страницы не выкидывает пользователя из сессии. Нет ни того,
 * ни другого — уводим на /login с возвратом по `next`.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void ensureAccessToken().then((token) => {
      if (!active) return;
      if (token) {
        setReady(true);
        return;
      }
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    });

    return () => {
      active = false;
    };
  }, [router, pathname]);

  if (!ready) {
    return <p className="text-ink-soft">проверяю вход…</p>;
  }

  return <>{children}</>;
}
