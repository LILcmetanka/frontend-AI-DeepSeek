'use client';

import Link from 'next/link';
import {
  CommentIcon,
  HeartIcon,
  HooksterFace,
  ShareIcon,
  WandIcon,
} from '@/components/ui/icons';
import { StageBackdrop } from '@/features/game/stage-backdrop';
import type { GameDto } from '@/shared/api/axios-instance';

/**
 * Карточка игры в ленте — по макету «Главная · лента»: сверху и снизу
 * затемнение, внизу автор, название, описание, жанр, справа колонка
 * оверлеев (лайк, комменты, шер, ремикс). Сама игра занимает весь экран:
 * клик по фону открывает /feed/{id}, кнопки оверлеев его не перехватывают.
 */

interface GameCardProps {
  game: GameDto;
  liked: boolean;
  onLike: () => void;
  onNotify: (message: string) => void;
}

export function GameCard({ game, liked, onLike, onNotify }: GameCardProps) {
  const title = game.title || 'без названия';
  const genre = game.genreTitles?.[0];
  const author = `@${game.authorId.slice(0, 8)}`;

  async function share(): Promise<void> {
    const url = `${window.location.origin}/feed/${game.gameId}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      onNotify('ссылка скопирована');
    } catch (error) {
      // Отмена системного окна «поделиться» — не ошибка, молчим.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      onNotify('не удалось скопировать ссылку');
    }
  }

  return (
    <article className="relative h-full w-full overflow-hidden bg-stage select-none">
      <StageBackdrop gameId={game.gameId} />

      {/*
        Вся «сцена» — ссылка на игру: в макете клик по геймплею запускает
        игру. Верхние 58 px оставлены шапке с табами и логотипом.
      */}
      <Link
        href={`/feed/${game.gameId}`}
        aria-label={`играть: ${title}`}
        className="absolute inset-x-0 top-[58px] bottom-0 z-[5] cursor-pointer"
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[130px]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,6,3,0.72), rgba(6,6,3,0))',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,6,3,0) 0%, rgba(6,6,3,0.55) 45%, rgba(6,6,3,0.92) 100%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-5 z-[12] flex items-end gap-2.5 pr-3 pl-4 max-dt:bottom-20">
        <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
          <div className="flex min-w-0 flex-wrap items-center gap-[9px]">
            <span className="grid h-[34px] w-[34px] flex-none place-items-center overflow-hidden rounded-pill bg-acid">
              <HooksterFace className="w-[25px] text-peel-900" />
            </span>
            <span className="scrim-text min-w-0 flex-[0_1_auto] truncate text-[15px] font-extrabold text-peel-25">
              {author}
            </span>
            {/*
              Подписок нет ни в контрактах, ни в шлюзе (follow-методов нет).
              Кнопку оставляем по макету, но неактивной: врать про
              состояние «подписан» нечем.
            */}
            <button
              type="button"
              disabled
              title="подписки появятся, когда в API будет список авторов"
              className="flex-none cursor-not-allowed rounded-pill border-2 border-[rgba(242,242,232,0.5)] px-[11px] py-[5px] text-[12px] font-bold text-peel-25 opacity-60"
            >
              подписаться
            </button>
          </div>

          <h2 className="scrim-title font-display text-[22px] leading-[1.06] font-extrabold tracking-[-0.03em] text-peel-25 sm:text-[23px]">
            {title}
          </h2>

          {game.description && (
            <p className="scrim-text line-clamp-1 text-[14px] leading-[1.45] font-medium text-peel-100">
              {game.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-px">
            {genre && (
              <span className="rounded-pill bg-[rgba(242,242,232,0.14)] px-2.5 py-[5px] font-mono text-[11px] text-peel-25 backdrop-blur-[8px]">
                {genre}
              </span>
            )}
            {/*
              Просмотры (пилюля с глазом) в макете есть, но GET /feed их не
              отдаёт: в delivery это колонка в БД без маршрута чтения.
              Значение не выдумываем — пилюля скрыта.
            */}
          </div>
        </div>

        <div className="flex w-[62px] flex-none flex-col items-center gap-3.5 pb-0.5">
          <div className="flex flex-col items-center gap-[5px]">
            <button
              type="button"
              onClick={onLike}
              aria-label={liked ? 'убрать лайк' : 'лайк'}
              aria-pressed={liked}
              className={`grid h-12 w-12 place-items-center rounded-pill bg-[rgba(6,6,3,0.5)] backdrop-blur-[12px] transition-[background,transform] duration-150 hover:bg-[rgba(6,6,3,0.72)] active:scale-[0.94] ${
                liked ? 'text-hot' : 'text-peel-25'
              }`}
            >
              <HeartIcon
                filled={liked}
                className={`h-[25px] w-[25px] ${liked ? 'animate-pop' : ''}`}
              />
            </button>
            {/*
              Счётчика лайков нет: POST/DELETE /likes отвечают 204, а
              GET /likes отдаёт только id. Число не показываем.
            */}
          </div>

          <button
            type="button"
            aria-label="комментарии"
            title="комментарии появятся позже"
            onClick={() => onNotify('комментарии появятся позже')}
            className="grid h-12 w-12 place-items-center rounded-pill bg-[rgba(6,6,3,0.5)] text-peel-25 backdrop-blur-[12px] transition-[background,transform] duration-150 hover:bg-[rgba(6,6,3,0.72)] active:scale-[0.94]"
          >
            <CommentIcon className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() => void share()}
            aria-label="поделиться"
            className="grid h-12 w-12 place-items-center rounded-pill bg-[rgba(6,6,3,0.5)] text-peel-25 backdrop-blur-[12px] transition-[background,transform] duration-150 hover:bg-[rgba(6,6,3,0.72)] active:scale-[0.94]"
          >
            <ShareIcon className="h-[21px] w-[21px]" />
          </button>

          <div className="flex flex-col items-center gap-1.5 pt-1">
            <div className="mb-1.5 h-px w-7 bg-[rgba(242,242,232,0.25)]" />
            <Link
              href={`/create?gameId=${game.gameId}`}
              aria-label="сделать ремикс"
              className="animate-glow grid h-[60px] w-[60px] place-items-center rounded-pill bg-acid text-peel-900 transition-[background,transform] duration-150 hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.94]"
            >
              <WandIcon className="h-[27px] w-[27px]" />
            </Link>
            <span className="scrim-text font-mono text-[10px] font-bold tracking-[0.12em] text-acid uppercase">
              ремикс
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
