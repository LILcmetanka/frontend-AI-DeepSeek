'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { HooksterMark, HomeIcon, SearchIcon, UserIcon } from '@/components/ui/icons';
import { logout } from '@/shared/lib/auth';
import { useSignedIn } from '@/shared/lib/use-signed-in';

/**
 * Каркас приложения по макету «Главная · лента»: тёмный сайдбар 236 px
 * с логотипом и тремя пунктами, по центру — экран, на телефоне — нижняя
 * навигация. Раньше шапка была сверху и на каждой странице разной —
 * теперь она одна и не занимает высоту у ленты.
 */

const NAV = [
  { href: '/feed', label: 'главная', Icon: HomeIcon },
  { href: null, label: 'поиск', Icon: SearchIcon },
  { href: '/profile', label: 'профиль', Icon: UserIcon },
] as const;

/** «главная» — это и лента, и карточка игры внутри неё. */
function isActiveHref(pathname: string, href: string): boolean {
  if (href === '/feed') return pathname === '/feed' || pathname.startsWith('/feed/');
  return pathname === href;
}

function navClass(active: boolean): string {
  return [
    'flex h-12 items-center gap-3 rounded-md px-3.5 text-[15px] transition-colors duration-150',
    active
      ? 'bg-hover font-extrabold text-ink'
      : 'font-bold text-ink-soft hover:bg-hover hover:text-ink',
  ].join(' ');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Полноэкранная лента — маршрут без отступов и с обрезкой: карточка игры
  // должна занимать весь экран, как в макете.
  const isFeed = pathname === '/feed';
  // Профиль сам держит поля и ширину колонки 980 px из макета: sticky-шапка
  // во всю ширину не получится, если отступы добавляет каркас.
  // AI Remix сам держит карточку 1060 px из макета 06 — по той же причине.
  const isFullWidth = isFeed || pathname === '/profile' || pathname === '/create';

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-page text-ink">
      <aside className="hidden w-[236px] flex-none flex-col gap-[26px] border-r border-line bg-page px-4 pt-6 pb-5 dt:flex">
        <Link href="/feed" className="flex items-center gap-[9px] px-2">
          <HooksterMark className="-mt-0.5 h-[30px] w-[30px] flex-none text-acid" />
          <span className="font-display text-[25px] leading-none font-black tracking-[-0.045em] text-ink">
            hookster
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) =>
            href === null ? (
              // Поиска пока нет ни в макете-роутинге, ни в API. Пункт
              // оставляем визуально, но не делаем вид, что он работает.
              <span
                key={label}
                aria-disabled="true"
                title="поиск пока не готов"
                className={`${navClass(false)} cursor-not-allowed opacity-45`}
              >
                <Icon className="h-6 w-6 flex-none" />
                {label}
              </span>
            ) : (
              <Link
                key={label}
                href={href}
                aria-current={isActiveHref(pathname, href) ? 'page' : undefined}
                className={navClass(isActiveHref(pathname, href))}
              >
                <Icon
                  className={`h-6 w-6 flex-none ${isActiveHref(pathname, href) ? 'text-acid' : ''}`}
                />
                {label}
              </Link>
            ),
          )}
        </nav>

        <div className="h-px bg-line" />

        <div className="flex flex-col gap-2.5">
          <div className="px-3.5 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-mute uppercase">
            продолжить
          </div>
          {/*
            История игр и рекорды живут в metrics-service, но в шлюзе нет
            маршрута, который их отдаёт (`views`/`likes` — колонки в БД без
            кода чтения). Поэтому блок пустой и честно об этом пишет.
          */}
          <p className="px-3.5 font-mono text-[11px] leading-[1.5] text-ink-mute">
            пока пусто — сыграй первую игру
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 px-3.5">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <Link href="/create" className="text-ink-mute transition-colors hover:text-ink">
              AI Studio
            </Link>
            <AuthAction />
          </div>
          <div className="pt-2 font-mono text-[11px] leading-[1.5] text-ink-mute">
            <div className="mb-1.5 font-bold tracking-[0.14em] uppercase">
              жми и свайпай
            </div>
            ↑ ↓ или колесо — следующая игра
          </div>
        </div>
      </aside>

      <main
        className={
          isFeed
            ? 'relative min-w-0 flex-1 overflow-hidden'
            : isFullWidth
              ? 'min-w-0 flex-1 overflow-y-auto'
              : 'min-w-0 flex-1 overflow-y-auto px-4 pt-6 pb-24 dt:px-8 dt:py-8'
        }
      >
        {isFullWidth ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        )}
      </main>

      <MobileNav pathname={pathname} />
    </div>
  );
}

function AuthAction() {
  const signedIn = useSignedIn();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!signedIn) {
    return (
      <Link href="/login" className="text-ink-mute transition-colors hover:text-ink">
        войти
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="text-ink-mute transition-colors hover:text-ink disabled:opacity-50"
      onClick={() => {
        setPending(true);
        void logout().finally(() => {
          setPending(false);
          router.refresh();
        });
      }}
    >
      {pending ? 'выходим…' : 'выйти'}
    </button>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[66px] items-center justify-around border-t border-line bg-[rgba(6,6,3,0.72)] px-2 backdrop-blur-[14px] dt:hidden">
      {NAV.map(({ href, label, Icon }) =>
        href === null ? (
          <span
            key={label}
            aria-disabled="true"
            className="flex h-14 min-w-16 cursor-not-allowed flex-col items-center justify-center gap-1 font-mono text-[10px] font-bold tracking-[0.06em] text-ink-soft opacity-45"
          >
            <Icon className="h-6 w-6" />
            {label}
          </span>
        ) : (
          <Link
            key={label}
            href={href}
            aria-current={isActiveHref(pathname, href) ? 'page' : undefined}
            className={`flex h-14 min-w-16 flex-col items-center justify-center gap-1 font-mono text-[10px] font-bold tracking-[0.06em] transition-colors ${
              isActiveHref(pathname, href) ? 'text-acid' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Icon className="h-6 w-6" />
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
