'use client';

import { CloseIcon } from '@/components/ui/icons';
import { sendEvent } from '@/shared/api/axios-instance';
import { GamePlayer, type PlayerEvent } from '@/shared/lib/game-player';
import type { OfflineGameEntry } from '@/shared/lib/offline-games';

/**
 * Офлайн-игра поверх ленты (макет 08). Играем ровно тот пакет, что лежит
 * в `localStorage`: адрес пакета и контрольная сумма — из сохранённой
 * карточки. Никакой сети, кроме картинок-спрайтов, и та необязательна.
 *
 * События в метрики пытаемся отправить, но офлайн они не дойдут — это
 * ожидаемо и не должно ломать игру (ошибку только пишем в консоль).
 */
const GAME_URL = (process.env.NEXT_PUBLIC_GAME_URL ?? '').trim();
const SPRITE_BASE_URL = (process.env.NEXT_PUBLIC_SPRITE_BASE_URL ?? '').trim();

export function OfflinePlayer({
  entry,
  onClose,
}: {
  entry: OfflineGameEntry;
  onClose: () => void;
}) {
  const { game, code } = entry;

  function handleEvent(event: PlayerEvent): void {
    void sendEvent({
      userId: game.authorId,
      gameId: game.gameId,
      type: event.type,
      durationSec: event.durationSec,
    }).catch(() => {
      // Офлайн — событие не ушло; это не повод показывать ошибку.
    });
  }

  return (
    <div
      data-offline-player
      className="absolute inset-0 z-50 bg-peel-950"
      role="dialog"
      aria-label={`офлайн-игра: ${game.title}`}
    >
      <GamePlayer
        fill
        gameId={game.gameId}
        userId={game.authorId}
        config={game.config}
        gameUrl={GAME_URL}
        codeUrl={game.codeUrl}
        codeIntegrity={game.codeIntegrity}
        initialCode={code}
        spriteBaseUrl={SPRITE_BASE_URL}
        engineMinVersion={game.engineMinVersion}
        onEvent={handleEvent}
      />

      <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-2.5 bg-gradient-to-b from-[rgba(6,6,3,0.8)] to-transparent p-4">
        <span className="rounded-pill bg-danger/20 px-3 py-1.5 font-mono text-micro font-bold tracking-caps text-danger uppercase">
          офлайн
        </span>
        <p className="scrim-text min-w-0 flex-1 truncate font-display text-body font-extrabold text-peel-25">
          {game.title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="закрыть офлайн-игру"
          className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-overlay text-peel-25 backdrop-blur-[12px] transition-[background,transform] duration-[var(--dur-fast)] hover:bg-overlay active:scale-[0.94]"
        >
          <CloseIcon className="h-[18px] w-[18px]" />
        </button>
      </header>
    </div>
  );
}
