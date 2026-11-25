'use client';

import { PlayIcon, RotateIcon, WifiOffIcon } from '@/components/ui/icons';
import type { OfflineGameEntry } from '@/shared/lib/offline-games';

/**
 * «Связь пропала» по макету 08. Один экран на ленту, профиль и карточку
 * игры: сетевую ошибку не показываем технической строкой «Ошибка запроса»,
 * а объясняем словами и даём два выхода — повторить и (если игра уже
 * сохранена) сыграть офлайн.
 *
 * Число офлайн-игр берём из хранилища, а не выдумываем: нет сохранённых —
 * нет и кнопки.
 */
export function ConnectionLost({
  offlineGames = [],
  onRetry,
  onPlayOffline,
  message,
}: {
  offlineGames?: OfflineGameEntry[];
  onRetry: () => void;
  onPlayOffline?: (entry: OfflineGameEntry) => void;
  message?: string;
}) {
  const count = offlineGames.length;
  const first = offlineGames[0];
  const second = offlineGames[1];

  return (
    <div
      data-connection-lost
      className="grid h-full min-h-[60dvh] place-items-center px-6 text-center"
    >
      <div className="flex max-w-[360px] flex-col items-center gap-[18px]">
        <span className="grid h-[76px] w-[76px] place-items-center rounded-pill bg-hot/15">
          <WifiOffIcon className="h-[34px] w-[34px] text-hot-300" />
        </span>
        <p className="font-display text-[24px] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink">
          связь пропала
        </p>
        <p className="text-[14px] leading-[1.5] font-medium text-ink-soft">
          {message ??
            (count > 0
              ? `${count} ${pluralGames(count)} ${count === 1 ? 'сохранена' : 'сохранены'} офлайн — можно играть, пока сеть не вернётся`
              : 'проверьте подключение и попробуйте снова')}
        </p>

        <div className="flex w-full flex-col gap-2.5">
          {first && onPlayOffline && (
            <button
              type="button"
              onClick={() => onPlayOffline(first)}
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-pill bg-acid px-5 text-[15px] font-extrabold text-peel-900 transition-[background,transform] duration-150 hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.94]"
            >
              <PlayIcon className="h-[19px] w-[19px]" />
              играть офлайн
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-[46px] items-center justify-center gap-2 rounded-pill border-2 border-line-strong px-5 text-[14px] font-bold text-ink transition-colors duration-150 hover:border-acid hover:text-acid"
          >
            <RotateIcon className="h-[17px] w-[17px]" />
            попробовать снова
          </button>
          {second && onPlayOffline && (
            <button
              type="button"
              onClick={() => onPlayOffline(second)}
              className="truncate rounded-pill px-4 py-1.5 font-mono text-[12px] text-ink-mute transition-colors duration-150 hover:text-ink"
            >
              ещё офлайн: {second.game.title}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 1 игра, 2 игры, 5 игр. */
function pluralGames(value: number): string {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'игр';
  if (mod10 === 1) return 'игра';
  if (mod10 >= 2 && mod10 <= 4) return 'игры';
  return 'игр';
}
