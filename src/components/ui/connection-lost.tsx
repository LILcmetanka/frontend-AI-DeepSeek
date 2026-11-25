'use client';

import { PlayIcon, RotateIcon, WifiOffIcon } from '@/components/ui/icons';
import type { OfflineGameEntry } from '@/shared/lib/offline-games';
import { buttonClass } from '@/components/ui/controls';

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
        <span className="grid h-[76px] w-[76px] place-items-center rounded-pill bg-danger/15">
          <WifiOffIcon className="h-[34px] w-[34px] text-danger" />
        </span>
        <p className="font-display text-title-1 leading-title font-extrabold tracking-display text-ink">
          связь пропала
        </p>
        <p className="text-body-sm leading-body font-medium text-ink-soft">
          {message ??
            (count > 0
              ? `${count} ${pluralGames(count)} ${count === 1 ? 'сохранена' : 'сохранены'} офлайн — можно играть, пока сеть не вернётся`
              : 'проверь подключение и попробуй снова')}
        </p>

        <div className="flex w-full flex-col gap-2.5">
          {first && onPlayOffline && (
            <button
              type="button"
              onClick={() => onPlayOffline(first)}
              className={buttonClass('primary', 'lg')}
            >
              <PlayIcon className="h-[19px] w-[19px]" />
              играть офлайн
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-[46px] items-center justify-center gap-2 rounded-pill border-2 border-line-strong px-5 text-body-sm font-bold text-ink transition-colors duration-[var(--dur-fast)] hover:border-accent-line hover:text-accent"
          >
            <RotateIcon className="h-[17px] w-[17px]" />
            попробовать снова
          </button>
          {second && onPlayOffline && (
            <button
              type="button"
              onClick={() => onPlayOffline(second)}
              className="truncate rounded-pill px-4 py-1.5 font-mono text-caption text-ink-mute transition-colors duration-[var(--dur-fast)] hover:text-ink"
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
