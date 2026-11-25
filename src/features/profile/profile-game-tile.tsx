'use client';

import Link from 'next/link';
import { StageBackdrop } from '@/features/game/stage-backdrop';
import type { GameDto } from '@/shared/api/axios-instance';

/**
 * Карточка игры в сетке профиля — по макету «Профиль»: 9:16, снизу
 * затемнение, поверх него название и жанр. Наведение поднимает карточку
 * и обводит её кислотой, как в макете.
 *
 * Просмотров и лайков у игры нет: GET /feed/{id} не отдаёт ни счётчика
 * просмотров, ни числа лайков (GET /likes — только id). Строку статистики
 * не рисуем, чтобы не показывать выдуманные числа.
 */
export function ProfileGameTile({ game }: { game: GameDto }) {
  const title = game.title || 'без названия';
  const genre = game.genreTitles?.[0];

  return (
    <Link
      href={`/feed/${game.gameId}`}
      aria-label={`открыть игру: ${title}`}
      className="group relative block aspect-[9/16] overflow-hidden rounded-lg bg-peel-950 shadow-[inset_0_0_0_1px_var(--color-line)] transition-[transform,box-shadow] duration-200 ease-boing hover:-translate-y-1 hover:shadow-[inset_0_0_0_2px_var(--color-acid),0_0_24px_rgba(198,255,46,0.45)] active:scale-[0.98]"
    >
      <StageBackdrop
        gameId={game.gameId}
        className="origin-bottom scale-[1.35] brightness-125"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(to_bottom,rgba(6,6,3,0),rgba(6,6,3,0.55)_50%,rgba(6,6,3,0.93))]" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-[7px] p-2.5">
        <div className="line-clamp-2 font-display text-[13px] leading-[1.15] font-extrabold tracking-[-0.02em] text-peel-25 [text-shadow:0_2px_12px_rgba(6,6,3,0.9)]">
          {title}
        </div>
        {genre && (
          <span className="w-fit rounded-pill bg-[rgba(242,242,232,0.14)] px-2 py-[3px] font-mono text-[10px] text-peel-100 backdrop-blur-[8px]">
            {genre}
          </span>
        )}
      </div>
    </Link>
  );
}
