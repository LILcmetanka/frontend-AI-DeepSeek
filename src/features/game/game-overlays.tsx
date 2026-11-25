'use client';

import Link from 'next/link';
import {
  CommentIcon,
  HeartIcon,
  ShareIcon,
  WandIcon,
} from '@/components/ui/icons';

/**
 * Колонка оверлеев справа — одна и та же в ленте и на экране игры:
 * лайк, комментарии, «поделиться», ремикс. Числа не рисуем: в API нет
 * счётчиков лайков и комментариев, а «поделиться» показывает системное окно
 * или копирует ссылку.
 */

interface GameOverlaysProps {
  gameId: string;
  title: string;
  liked: boolean;
  onLike: () => void;
  onNotify: (message: string) => void;
}

export function GameOverlays({
  gameId,
  title,
  liked,
  onLike,
  onNotify,
}: GameOverlaysProps) {
  async function share(): Promise<void> {
    const url = `${window.location.origin}/feed/${gameId}`;
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
    <div className="flex w-[62px] flex-none flex-col items-center gap-3.5 pb-0.5">
      <div className="flex flex-col items-center gap-[5px]">
        <button
          type="button"
          onClick={onLike}
          aria-label={liked ? 'убрать лайк' : 'лайк'}
          aria-pressed={liked}
          className={`grid h-12 w-12 place-items-center rounded-md bg-overlay backdrop-blur-[12px] transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-overlay-strong active:scale-[0.94] focus-visible:shadow-glow-strong focus-visible:outline-none ${
            liked ? 'text-danger' : 'text-peel-25'
          }`}
        >
          <HeartIcon
            filled={liked}
            className={`h-[25px] w-[25px] ${liked ? 'animate-pop' : ''}`}
          />
        </button>
      </div>

      <button
        type="button"
        aria-label="комментарии"
        title="комментарии появятся позже"
        onClick={() => onNotify('комментарии появятся позже')}
        className="grid h-12 w-12 place-items-center rounded-md bg-overlay text-peel-25 backdrop-blur-[12px] transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-overlay-strong active:scale-[0.94] focus-visible:shadow-glow-strong focus-visible:outline-none"
      >
        <CommentIcon className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={() => void share()}
        aria-label="поделиться"
        className="grid h-12 w-12 place-items-center rounded-md bg-overlay text-peel-25 backdrop-blur-[12px] transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-overlay-strong active:scale-[0.94] focus-visible:shadow-glow-strong focus-visible:outline-none"
      >
        <ShareIcon className="h-[21px] w-[21px]" />
      </button>

      <div className="flex flex-col items-center gap-1.5 pt-1">
        <div className="mb-1.5 h-px w-7 bg-line-strong" />
        <Link
          href={`/create?gameId=${gameId}`}
          aria-label="сделать ремикс"
          className="animate-glow grid h-[54px] w-[54px] place-items-center rounded-md bg-acid text-on-acid transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.94] focus-visible:shadow-glow-strong focus-visible:outline-none"
        >
          <WandIcon className="h-[27px] w-[27px]" />
        </Link>
        <span className="scrim-text font-mono text-micro font-bold tracking-caps text-accent uppercase">
          ремикс
        </span>
      </div>
    </div>
  );
}
