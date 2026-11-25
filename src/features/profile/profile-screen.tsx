'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  HooksterFace,
  PencilIcon,
  SettingsIcon,
} from '@/components/ui/icons';
import { ProfileGameTile } from '@/features/profile/profile-game-tile';
import { Mascot } from '@/components/brand/brand';
import { ProfileEditSheet, ProfileSavedToast } from '@/features/profile/profile-form';
import { ConnectionLost } from '@/components/ui/connection-lost';
import { TraceIdNote } from '@/components/ui/trace-id-note';
import {
  errorMessage,
  getAccount,
  getGamesByIds,
  getLikedGameIds,
  getMe,
  getMyGames,
  isNetworkError,
  type GameDto,
  type ProfileDto,
} from '@/shared/api/axios-instance';
import { buttonClass } from '@/components/ui/controls';

/**
 * Экран профиля по макету «Профиль»: шапка с аватаром и ником, статистика,
 * вкладки «мои игры | понравившиеся | профиль» и сетка карточек 9:16.
 *
 * Чего нет в API — того нет и на экране: счётчиков подписчиков и подписок,
 * просмотров и лайков у игры шлюз не отдаёт, поэтому эти цифры не
 * выдумываются, а блоки просто не рисуются (есть подписки только у ленты —
 * там честная заглушка). Редактирование — поверх экрана: PATCH /profile/me
 * умеет username, name, birth_date и avatar_url.
 */

type Tab = 'mine' | 'liked' | 'about';

/** Сколько игр тянем за один заход: сетка листается прокруткой вниз. */
const MINE_LIMIT = 48;
const LIKED_LIMIT = 100;
/** Карточки понравившихся собираем по одной: /likes отдаёт только id. */
const LIKED_TILES = 50;

export function ProfileScreen() {
  const [tab, setTab] = useState<Tab>('mine');
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  });

  const myGames = useQuery({
    queryKey: ['my-games', 'profile'],
    queryFn: () => getMyGames({ limit: MINE_LIMIT }),
    retry: false,
  });

  // Ключ тот же, что у ленты: лайк, поставленный в ленте, обновит и профиль.
  const likes = useQuery({
    queryKey: ['likes'],
    queryFn: () => getLikedGameIds(LIKED_LIMIT),
    retry: false,
    staleTime: 60_000,
  });

  const likedGames = useQuery({
    queryKey: ['liked-games'],
    queryFn: async () => getGamesByIds((likes.data ?? []).slice(0, LIKED_TILES)),
    enabled: tab === 'liked' && (likes.data?.length ?? 0) > 0,
    retry: false,
  });

  // Аккаунт авторизации нужен только вкладке «профиль»: почта, телефон и
  // отметки подтверждения живут там, а не в profile-service.
  const account = useQuery({
    queryKey: ['account'],
    queryFn: getAccount,
    enabled: tab === 'about' && me.data !== undefined,
    retry: false,
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

  if (me.isPending) {
    return <ProfileFrame title="Загружаем профиль…" />;
  }

  if (me.isError) {
    // Макет 08: сеть — отдельное состояние с человеческим текстом.
    if (isNetworkError(me.error)) {
      return (
        <div className="mx-auto w-full max-w-[980px] px-4">
          <ConnectionLost
            onRetry={() => void me.refetch()}
            message="профиль не загрузился: сервер не ответил. проверьте связь и попробуйте снова"
          />
        </div>
      );
    }
    return (
      <ProfileFrame title={errorMessage(me.error)}>
        <TraceIdNote error={me.error} />
        <button
          type="button"
          onClick={() => void me.refetch()}
          className="mt-4 inline-flex h-12 items-center rounded-pill border-2 border-line-strong px-5 text-body-sm font-bold text-ink transition-colors duration-[var(--dur-fast)] hover:border-accent-line hover:text-accent"
        >
          повторить
        </button>
      </ProfileFrame>
    );
  }

  const profile = me.data;
  const handle = profile.username ? `@${profile.username}` : 'без ника';
  const displayName = profile.name?.trim() ? profile.name : handle;

  const mineCount = myGames.data?.games.length ?? null;
  const mineMore = Boolean(myGames.data?.nextCursor);
  const likedCount = likes.data?.length ?? null;

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 pb-24 dt:pb-10">
      <header className="sticky top-0 z-40 -mx-4 flex items-center gap-2.5 border-b border-line bg-page px-3.5 py-2.5">
        <Link
          href="/feed"
          aria-label="назад в ленту"
          className="grid h-11 w-11 flex-none place-items-center rounded-md bg-hover text-ink transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-hover-strong focus-visible:shadow-glow-strong focus-visible:outline-none active:scale-[0.94]"
        >
          <ArrowLeftIcon className="h-[22px] w-[22px]" />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <div className="truncate text-body font-extrabold text-ink">
            {handle}
          </div>
          <div className="truncate font-mono text-micro text-ink-mute">
            {mineCount === null
              ? '…'
              : mineCount === 0
                ? 'пока нет игр'
                : `${formatCount(mineCount, mineMore)} ${pluralGames(mineCount)}`}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="редактировать профиль"
          title="редактировать профиль"
          className="grid h-11 w-11 flex-none place-items-center rounded-md bg-hover text-ink transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-hover-strong focus-visible:shadow-glow-strong focus-visible:outline-none active:scale-[0.94]"
        >
          <SettingsIcon className="h-[22px] w-[22px]" />
        </button>
      </header>

      <section className="flex flex-col gap-[18px] pt-[22px]">
        <div className="flex items-start gap-4">
          <Avatar profile={profile} />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
            <h1 className="m-0 font-display text-title-1 leading-title font-black tracking-display text-ink">
              {displayName}
            </h1>
            <div className="font-mono text-caption text-ink-soft">{handle}</div>
          </div>
        </div>

        {/*
          Био в контракте нет, «топ-автора» тоже: единственный бейдж
          макета скрыт, чтобы не подписывать человека выдуманным статусом.
        */}

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={buttonClass('primary', 'lg', 'min-w-0 flex-[0_1_320px]')}
          >
            <PencilIcon className="h-[19px] w-[19px]" />
            редактировать профиль
          </button>
          {/*
            «поделиться» из макета не рисуем: публичной страницы профиля
            нет, ссылка на /profile открывается только у владельца.
          */}
        </div>

        <div className="grid grid-cols-2 gap-[2px] overflow-hidden rounded-lg border border-line bg-line">
          <StatCell
            value={mineCount === null ? '…' : formatCount(mineCount, mineMore)}
            label="игр"
          />
          <StatCell
            value={likedCount === null ? '…' : formatCount(likedCount, likedCount >= LIKED_LIMIT)}
            label="лайков"
          />
        </div>
      </section>

      <nav
        role="tablist"
        aria-label="Разделы профиля"
        className="sticky top-[65px] z-30 mt-[22px] flex gap-3.5 overflow-x-auto border-b border-line bg-page px-0.5 dt:gap-[22px] [scrollbar-width:none]"
      >
        <TabButton
          active={tab === 'mine'}
          count={mineCount}
          more={mineMore}
          onClick={() => setTab('mine')}
        >
          мои игры
        </TabButton>
        <TabButton
          active={tab === 'liked'}
          count={likedCount}
          more={likedCount !== null && likedCount >= LIKED_LIMIT}
          onClick={() => setTab('liked')}
        >
          понравившиеся
        </TabButton>
        <TabButton active={tab === 'about'} count={null} onClick={() => setTab('about')}>
          профиль
        </TabButton>
      </nav>

      {tab === 'mine' && (
        <GameGrid
          games={myGames.data?.games}
          isPending={myGames.isPending}
          error={myGames.isError ? errorMessage(myGames.error) : null}
          onRetry={() => void myGames.refetch()}
          emptyTitle="здесь пока пусто"
          emptyText="первая игра появится сразу после ремикса. чужой шаблон подойдёт"
          emptyAction={{ href: '/create', label: 'начать с ремикса' }}
        />
      )}

      {tab === 'liked' && (
        <GameGrid
          games={likedGames.data}
          isPending={likes.isPending || (likedGames.isPending && (likes.data?.length ?? 0) > 0)}
          error={
            likes.isError
              ? errorMessage(likes.error)
              : likedGames.isError
                ? errorMessage(likedGames.error)
                : null
          }
          onRetry={() => {
            if (likes.isError) void likes.refetch();
            else void likedGames.refetch();
          }}
          emptyTitle="здесь пока пусто"
          emptyText="отмечайте игры в ленте — они появятся здесь"
          emptyAction={{ href: '/feed', label: 'в ленту' }}
        />
      )}

      {tab === 'about' && (
        <AboutTab
          profile={profile}
          handle={handle}
          account={account.data}
          accountPending={account.isPending}
          accountFailed={account.isError}
        />
      )}

      {editing && (
        <ProfileEditSheet
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            notify('профиль сохранён');
          }}
        />
      )}

      {toast && <ProfileSavedToast message={toast} />}
    </div>
  );
}

/* ---------- шапка профиля ---------- */

function Avatar({ profile }: { profile: ProfileDto }) {
  return (
    <span className="grid h-[88px] w-[88px] flex-none place-items-center overflow-hidden rounded-pill bg-acid shadow-glow">
      {profile.avatar_url ? (
        // Ссылка приходит из профиля, домены заранее неизвестны — next/image
        // тут не поможет без настройки remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.name ? `аватар: ${profile.name}` : 'аватар'}
          className="h-full w-full object-cover"
        />
      ) : (
        <HooksterFace className="w-[66px] text-on-acid" />
      )}
    </span>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-raised px-1.5 py-3.5">
      <div className="font-mono text-title-3 font-bold text-ink tabular-nums">
        {value}
      </div>
      <div className="text-center font-mono text-micro font-bold tracking-caps text-ink-mute uppercase">
        {label}
      </div>
    </div>
  );
}

/* ---------- вкладки ---------- */

function TabButton({
  active,
  count,
  more = false,
  onClick,
  children,
}: {
  active: boolean;
  count: number | null;
  more?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px inline-flex shrink-0 items-center gap-[7px] border-b-[3px] bg-transparent pt-2 pb-[11px] text-body whitespace-nowrap transition-colors duration-[var(--dur-fast)] ${
        active
          ? 'border-accent-line font-extrabold text-ink'
          : 'border-transparent font-bold text-ink-mute hover:text-ink'
      }`}
    >
      {children}
      {count !== null && (
        <span
          className={`rounded-pill px-[7px] py-[3px] font-mono text-micro font-bold ${
            active ? 'bg-acid text-on-acid' : 'bg-hover text-ink-soft'
          }`}
        >
          {formatCount(count, more)}
        </span>
      )}
    </button>
  );
}

/* ---------- сетка игр ---------- */

function GameGrid({
  games,
  isPending,
  error,
  onRetry,
  emptyTitle,
  emptyText,
  emptyAction,
}: {
  games: GameDto[] | undefined;
  isPending: boolean;
  error: string | null;
  onRetry: () => void;
  emptyTitle: string;
  emptyText: string;
  emptyAction: { href: string; label: string };
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 pt-10 text-center">
        <p className="text-body font-bold text-ink">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center rounded-pill border-2 border-line-strong px-5 text-body-sm font-bold text-ink transition-colors duration-[var(--dur-fast)] hover:border-accent-line hover:text-accent"
        >
          повторить
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2.5 pt-3.5">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="aspect-[9/16] animate-pulse rounded-lg bg-hover"
          />
        ))}
      </div>
    );
  }

  if (!games || games.length === 0) {
    // Пустая вкладка по макету 08: три пунктирные плитки 9:16, заголовок,
    // объяснение и один выход. Мускот — один на экран, обрезан краем.
    return (
      <div
        data-empty-grid
        className="relative flex flex-col items-center gap-[18px] pt-10 pb-6 text-center"
      >
        <Mascot
          size={96}
          tilt="c"
          className="absolute top-1 right-0 translate-x-[18%] opacity-90"
        />
        <div className="grid w-full max-w-[360px] grid-cols-3 gap-2 opacity-60">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="aspect-[9/16] rounded-lg border border-dashed border-line-strong bg-hover/50"
            />
          ))}
        </div>
        <p className="font-display text-title-1 leading-title font-extrabold tracking-display text-ink">
          {emptyTitle}
        </p>
        <p className="max-w-[320px] text-body-sm leading-body font-medium text-ink-soft">
          {emptyText}
        </p>
        <Link
          href={emptyAction.href}
          className={buttonClass('primary', 'md')}
        >
          {emptyAction.label}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2.5 pt-3.5">
      {games.map((game) => (
        <ProfileGameTile key={game.gameId} game={game} />
      ))}
    </div>
  );
}

/* ---------- вкладка «профиль» ---------- */

function AboutTab({
  profile,
  handle,
  account,
  accountPending,
  accountFailed,
}: {
  profile: ProfileDto;
  handle: string;
  account: Awaited<ReturnType<typeof getAccount>> | undefined;
  accountPending: boolean;
  accountFailed: boolean;
}) {
  const email = profile.email ?? account?.email ?? null;
  const phone = profile.phone ?? account?.phone ?? null;

  return (
    <section className="flex flex-col gap-3 pt-3.5">
      <dl className="grid gap-2.5 sm:grid-cols-2">
        <InfoRow label="логин" value={handle} />
        <InfoRow label="имя" value={profile.name ?? '—'} />
        <InfoRow label="дата рождения" value={formatBirthDate(profile.birth_date)} />
        <InfoRow label="аватар" value={profile.avatar_url ?? '—'} mono />
        <InfoRow
          label="почта"
          value={email ?? (accountPending ? '…' : '—')}
          note={verificationNote(account?.is_email_verified, accountFailed)}
        />
        <InfoRow
          label="телефон"
          value={phone ?? (accountPending ? '…' : '—')}
          note={verificationNote(account?.is_phone_verified, accountFailed)}
        />
      </dl>

      <p className="rounded-lg border border-line bg-raised px-4 py-3 text-caption leading-body text-ink-mute">
        почта и телефон меняются только кодом подтверждения, экрана для этого
        пока нет. логин, имя, дата рождения и аватар редактируются здесь.
      </p>
    </section>
  );
}

function InfoRow({
  label,
  value,
  note,
  mono = false,
}: {
  label: string;
  value: string;
  note?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-raised px-4 py-3.5">
      <dt className="font-mono text-micro font-bold tracking-caps text-ink-mute uppercase">
        {label}
      </dt>
      <dd
        className={`truncate text-body font-semibold text-ink ${mono ? 'font-mono text-caption font-medium text-ink-soft' : ''}`}
      >
        {value}
      </dd>
      {note && <span className="text-caption text-ink-mute">{note}</span>}
    </div>
  );
}

function verificationNote(verified: boolean | undefined, failed: boolean): string | null {
  if (failed) return 'аккаунт не отдался — статус неизвестен';
  if (verified === undefined) return null;
  return verified ? 'подтверждено' : 'не подтверждено';
}

/* ---------- заглушки состояния ---------- */

function ProfileFrame({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div className="flex max-w-[360px] flex-col items-center">
        <p className="text-title-3 leading-body font-bold text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}

/* ---------- форматирование ---------- */

/** Русский счёт: 1 игра, 2 игры, 5 игр. */
function pluralGames(value: number): string {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'игр';
  if (mod10 === 1) return 'игра';
  if (mod10 >= 2 && mod10 <= 4) return 'игры';
  return 'игр';
}

/**
 * Число как в макете: до тысячи — как есть, дальше «1,2к». `capped` значит,
 * что шлюз отдал не всё (лимит страницы), поэтому честное «+».
 */
function formatCount(value: number, capped = false): string {
  const suffix = capped ? '+' : '';
  if (value < 1000) return `${value}${suffix}`;
  const thousands = (value / 1000).toFixed(value < 10_000 ? 1 : 0);
  return `${thousands.replace('.', ',').replace(',0', '')}к${suffix}`;
}

/** ISO-дата из профиля → 31.12.1999; пустая — прочерк. */
function formatBirthDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
