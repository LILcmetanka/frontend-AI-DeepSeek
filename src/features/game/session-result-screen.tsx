'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, RotateIcon, WandIcon } from '@/components/ui/icons';
import { StageBackdrop } from '@/features/game/stage-backdrop';
import { getFeed } from '@/shared/api/axios-instance';
import {
  formatDuration,
  readSessionResult,
  type SessionResult,
} from '@/shared/lib/session-result';

/**
 * Экран итога сессии — макет «03 Session Result».
 *
 * Данные только свои: время и (если движок прислал) очки из
 * `session-result.ts`, название игры и подложка — из карточки. Рекорда,
 * комбо, попаданий и места в суточной таблице в API нет, поэтому их нет и
 * здесь: большая цифра — очки, когда они есть, иначе время сессии.
 *
 * Выходы как в макете: своя версия (AI Remix), «ещё раз» (та же игра),
 * «дальше» (следующая игра ленты) и «поделиться результатом».
 */

export function SessionResultScreen({ gameId }: { gameId: string }) {
  const [result, setResult] = useState<SessionResult | null | undefined>(
    undefined,
  );
  const [toast, setToast] = useState<string | null>(null);

  // sessionStorage доступен только в браузере: читаем после монтирования,
  // чтобы разметка сервера и клиента не разошлась.
  useEffect(() => {
    setResult(readSessionResult());
  }, []);

  // «Дальше» — следующая игра той же выдачи, что и лента.
  const feed = useQuery({
    queryKey: ['feed', 'for_you', 'after-session'],
    queryFn: () => getFeed({ category: 'for_you', limit: 20 }),
    retry: false,
    staleTime: 60_000,
  });

  const nextHref = useMemo(() => {
    const games = feed.data?.games ?? [];
    if (games.length === 0) return '/feed';
    const index = games.findIndex((game) => game.gameId === gameId);
    // Игры нет в выдаче — ведём в начало ленты, а не в пустоту.
    if (index === -1) return `/feed/${games[0].gameId}`;
    const next = games[index + 1];
    if (!next) return '/feed';
    return `/feed/${next.gameId}`;
  }, [feed.data?.games, gameId]);

  const own = result && result.gameId === gameId ? result : null;

  async function share(): Promise<void> {
    if (!own) return;
    const url = `${window.location.origin}/feed/${own.gameId}`;
    const text = `Я сыграл в «${own.title || 'игру'}» — ${formatDuration(own.durationSec)}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: own.title || 'Hookster', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setToast('результат скопирован');
      window.setTimeout(() => setToast(null), 2300);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setToast('не удалось поделиться');
      window.setTimeout(() => setToast(null), 2300);
    }
  }

  // Ещё не прочитали хранилище — пустой кадр вместо мигания «сессии нет».
  if (result === undefined) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-stage dt:p-6">
        <div className="feed-frame" />
      </div>
    );
  }

  if (!own) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-stage dt:p-6">
        <div className="feed-frame">
          <div className="absolute inset-0 grid place-items-center px-8 text-center">
            <div className="flex max-w-[320px] flex-col items-center">
              <p className="text-[17px] leading-[1.35] font-bold text-peel-25">
                Итога сессии нет
              </p>
              <p className="mt-2 text-[14px] leading-[1.5] text-ink-soft">
                Сыграйте игру — после выхода здесь будет время сессии.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/feed/${gameId}`}
                  className="rounded-pill bg-acid px-5 py-2.5 text-[14px] font-extrabold text-peel-900 transition-colors hover:bg-acid-hi"
                >
                  играть
                </Link>
                <Link
                  href="/feed"
                  className="rounded-pill border-2 border-line-strong px-5 py-2.5 text-[14px] font-bold text-peel-25 transition-colors hover:border-acid hover:text-acid"
                >
                  к ленте
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasScore = typeof own.score === 'number';
  const big = hasScore ? formatScore(own.score as number) : formatDuration(own.durationSec);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-stage dt:p-6">
      <div className="feed-frame">
        {/* Подложка как в макете: размытый кадр игры под затемнением. */}
        <div className="absolute inset-0 opacity-50 blur-[3px]">
          <StageBackdrop gameId={own.gameId} />
        </div>
        <div className="absolute inset-0 bg-[rgba(6,6,3,0.74)]" />

        <div className="absolute inset-0 flex flex-col justify-center gap-6 overflow-y-auto p-7 max-dt:pb-24">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-peel-300 uppercase">
              {hasScore ? 'очки за сессию' : 'время сессии'}
            </span>
            <div
              data-session-result
              className="font-display text-[64px] leading-none font-black tracking-[-0.04em] tabular-nums text-lime-300"
            >
              {big}
            </div>
            <div className="text-[15px] font-semibold text-peel-100">
              {own.title || 'Игра'}
            </div>
          </div>

          {hasScore && (
            <div className="grid grid-cols-1 overflow-hidden rounded-lg bg-[rgba(242,242,232,0.14)]">
              <div className="flex flex-col items-center gap-1 bg-[rgba(6,6,3,0.72)] px-1.5 py-[15px]">
                <div className="font-mono text-[18px] font-bold text-peel-25">
                  {formatDuration(own.durationSec)}
                </div>
                <div className="font-mono text-[10px] tracking-[0.1em] text-peel-300 uppercase">
                  время
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Link
              href={`/create?gameId=${own.gameId}`}
              className="flex h-14 items-center justify-center gap-[9px] rounded-pill bg-acid text-[16px] font-extrabold text-peel-900 transition-[background,transform] duration-150 hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.94]"
            >
              <WandIcon className="h-5 w-5" />
              сделать свою версию
            </Link>

            <div className="flex gap-2.5">
              <Link
                href={`/feed/${own.gameId}`}
                className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-pill border-2 border-[rgba(242,242,232,0.4)] text-[15px] font-bold text-peel-25 transition-colors duration-150 hover:border-lime-300 hover:text-lime-300 active:scale-[0.94]"
              >
                <RotateIcon className="h-[18px] w-[18px]" />
                ещё раз
              </Link>
              <Link
                href={nextHref}
                className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-pill border-2 border-[rgba(242,242,232,0.4)] text-[15px] font-bold text-peel-25 transition-colors duration-150 hover:border-lime-300 hover:text-lime-300 active:scale-[0.94]"
              >
                дальше
                <ChevronDownIcon className="h-[18px] w-[18px]" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => void share()}
              className="p-1.5 font-mono text-[12px] text-peel-300 transition-colors duration-150 hover:text-peel-25"
            >
              поделиться результатом
            </button>
          </div>
        </div>

        {toast && (
          <div className="animate-toast absolute top-[74px] left-1/2 z-40 -translate-x-1/2 rounded-pill bg-peel-25 px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-peel-900 shadow-pop">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/** Очки по-русски: «12 480». */
function formatScore(score: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(score));
}
