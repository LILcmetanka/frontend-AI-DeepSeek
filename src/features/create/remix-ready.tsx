'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { PlayIcon, RotateIcon } from '@/components/ui/icons';
import { StageBackdrop } from '@/features/game/stage-backdrop';
import { formatDuration } from '@/features/create/remix-status';
import { getGameCached } from '@/shared/lib/game-cache';
import { authorHandle } from '@/shared/lib/author';

/**
 * Remix Ready — макет 07: слева карточка новой игры 9:16, справа итог,
 * промпт и действия. Цифры («слоёв механики», «вес») в макете нарисованы,
 * но API их не отдаёт — поэтому их нет и здесь.
 *
 * Длительность генерации — реальная: время от POST /generate до SUCCESS,
 * измеренное на клиенте.
 */
export function RemixReady({
  gameId,
  sourceGameId,
  prompt,
  startedAt,
}: {
  gameId: string;
  sourceGameId: string;
  prompt: string;
  startedAt: number | null;
}) {
  const game = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGameCached(gameId),
    retry: false,
    staleTime: 30_000,
  });

  // Фиксируем на монтировании: иначе таймер на экране результата «тикал» бы.
  const [elapsedSec] = useState(() =>
    startedAt === null ? 0 : Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
  );

  const data = game.data;
  const title = data?.title || 'новая игра';
  const genre = data?.genreTitles?.[0];
  const meta = [
    data ? authorHandle(data.authorId) : null,
    genre ?? null,
    'ремикс',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex min-h-dvh w-full items-start justify-center bg-stage px-4 py-6 pb-24 dt:items-center dt:p-10">
      <div className="flex w-full max-w-[1000px] flex-col items-stretch gap-7 dt:flex-row dt:items-center dt:gap-11">
        {/* карточка новой игры */}
        <div className="remix-preview relative mx-auto aspect-[9/16] h-[46dvh] w-auto max-w-full flex-none overflow-hidden rounded-xl bg-peel-950 dt:h-auto dt:w-full dt:max-w-[420px]">
          <StageBackdrop gameId={gameId} />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[120px]"
            style={{
              background: 'linear-gradient(to bottom, rgba(6,6,3,0.7), rgba(6,6,3,0))',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%]"
            style={{
              background: 'linear-gradient(to bottom, rgba(6,6,3,0), rgba(6,6,3,0.9))',
            }}
          />

          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-pill bg-acid px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-peel-900 uppercase">
            твой ремикс
          </span>

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 dt:gap-2 dt:p-5">
            <div className="scrim-title font-display text-[17px] leading-[1.08] font-extrabold tracking-[-0.03em] text-peel-25 dt:text-[22px]">
              {title}
            </div>
            <div className="truncate font-mono text-[11px] text-peel-300">
              {meta}
            </div>
          </div>
        </div>

        {/* итог и действия */}
        <div className="flex min-w-0 flex-1 flex-col gap-5 dt:max-w-[500px]">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-acid uppercase">
              {elapsedSec > 0 ? `готово за ${formatDuration(elapsedSec)}` : 'готово'}
            </span>
            <h1 className="m-0 font-display text-[28px] leading-[1.05] font-black tracking-[-0.035em] text-ink dt:text-[36px]">
              это твоя версия
            </h1>
            <p className="m-0 max-w-[44ch] text-[15px] leading-[1.5] font-medium text-ink-soft">
              механика осталась от оригинала, всё остальное собрано заново.
              Можно играть сразу или переделать ещё раз.
            </p>
          </div>

          {prompt && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-raised p-[18px]">
              <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-ink-mute uppercase">
                твой промпт
              </span>
              <p className="m-0 max-h-[132px] overflow-y-auto font-mono text-[12px] leading-[1.6] text-ink-soft whitespace-pre-wrap">
                {prompt}
              </p>
            </div>
          )}

          {game.isError && (
            <p className="m-0 rounded-md border border-hot/40 bg-[rgba(255,46,147,0.12)] px-3.5 py-3 text-[13px] leading-[1.5] font-semibold text-hot-200">
              игра сохранена, но карточка не загрузилась — можно играть, а
              название подтянется позже
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            <Link
              href={`/feed/${gameId}`}
              className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-pill bg-acid text-[16px] font-extrabold text-peel-900 transition-[background,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-acid-hi hover:shadow-[0_0_24px_rgba(198,255,46,0.45)] active:scale-[0.94]"
            >
              <PlayIcon className="h-5 w-5" />
              играть
            </Link>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                href={`/create?gameId=${encodeURIComponent(gameId)}`}
                className="inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-pill border-2 border-line-strong text-[15px] font-bold text-ink transition-[border-color,color,transform] duration-150 hover:-translate-y-0.5 hover:border-acid hover:text-acid active:scale-[0.94]"
              >
                <RotateIcon className="h-[19px] w-[19px]" />
                ещё ремикс
              </Link>

              {sourceGameId && sourceGameId !== gameId && (
                <Link
                  href={`/feed/${sourceGameId}`}
                  className="inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-pill border-2 border-line-strong text-[15px] font-bold text-ink transition-[border-color,color,transform] duration-150 hover:-translate-y-0.5 hover:border-acid hover:text-acid active:scale-[0.94]"
                >
                  к оригиналу
                </Link>
              )}
            </div>
          </div>

          <p className="m-0 font-mono text-[11px] text-ink-mute">
            игра уже в ленте — её видно в «мои игры» и рекомендациях
          </p>
        </div>
      </div>
    </div>
  );
}
