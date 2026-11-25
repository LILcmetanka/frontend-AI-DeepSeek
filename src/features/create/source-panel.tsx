'use client';

import { HooksterFace } from '@/components/ui/icons';
import { StageBackdrop } from '@/features/game/stage-backdrop';
import type { GameDto } from '@/shared/api/axios-instance';
import { authorHandle } from '@/shared/lib/author';
import { buttonClass } from '@/components/ui/controls';

/**
 * Левая колонка макета 06: исходная игра, поверх которой идёт генерация.
 * Превью геймплея API не отдаёт — рисуем ту же «сцену», что и карточка
 * ленты (StageBackdrop), и честно подписываем её «исходный шаблон».
 *
 * Нет выбранной игры — не пустая рамка, а состояние из макета 08:
 * маскот, объяснение и кнопка выбора.
 */
export function SourcePanel({
  game,
  pending,
  failed,
  locked = false,
  onPick,
}: {
  game: GameDto | undefined;
  pending: boolean;
  failed: boolean;
  /** Генерация уже идёт: менять исходную игру поздно. */
  locked?: boolean;
  onPick: () => void;
}) {
  return (
    <div className="relative flex min-h-[240px] flex-col overflow-hidden border-b border-line bg-stage dt:min-h-full dt:border-r dt:border-b-0">
      {game ? (
        <>
          <StageBackdrop gameId={game.gameId} config={game.config} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(6,6,3,0.55), rgba(6,6,3,0) 30%, rgba(6,6,3,0.9))',
            }}
          />

          <span className="absolute top-4 left-4 rounded-pill bg-hover-strong px-2.5 py-[5px] font-mono text-micro font-bold tracking-caps text-peel-25 uppercase backdrop-blur-[8px]">
            исходный шаблон
          </span>

          <button
            type="button"
            onClick={onPick}
            disabled={locked}
            title={locked ? 'генерация уже идёт — дождись результата' : undefined}
            className="absolute top-3 right-3 inline-flex h-9 items-center rounded-pill bg-overlay px-3.5 font-mono text-micro font-bold text-peel-25 backdrop-blur-[12px] transition-[background,transform] duration-[var(--dur-fast)] hover:bg-overlay active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40"
          >
            сменить
          </button>

          <div className="relative mt-auto flex min-w-0 flex-col gap-1.5 p-4 dt:p-[18px]">
            <div className="scrim-title font-display text-title-2 leading-title font-extrabold tracking-display text-peel-25">
              {game.title || 'без названия'}
            </div>
            <div className="truncate font-mono text-micro text-peel-300">
              {gameMeta(game)}
            </div>
          </div>
        </>
      ) : (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5 px-7 py-9 text-center">
          <span className="grid h-[76px] w-[76px] flex-none place-items-center rounded-pill bg-acid">
            <HooksterFace className="w-[57px] text-on-acid" />
          </span>

          {pending ? (
            <div className="font-display text-title-2 leading-title font-extrabold tracking-display text-ink">
              загружаем игру…
            </div>
          ) : failed ? (
            <>
              <div className="font-display text-title-2 leading-title font-extrabold tracking-display text-ink">
                игру не открыть
              </div>
              <p className="m-0 text-body-sm leading-body font-medium text-ink-soft">
                ссылка на игру не сработала — выбери шаблон из ленты: ремикс
                собирается поверх любой игры
              </p>
            </>
          ) : (
            <>
              <div className="font-display text-title-2 leading-title font-extrabold tracking-display text-ink">
                нет исходной игры
              </div>
              <p className="m-0 text-body-sm leading-body font-medium text-ink-soft">
                ремикс собирается поверх готовой игры: механика остаётся, ассеты
                и правила собираются заново
              </p>
            </>
          )}

          <button
            type="button"
            onClick={onPick}
            className={buttonClass('primary', 'lg', 'mt-1')}
          >
            выбрать игру
          </button>
        </div>
      )}
    </div>
  );
}

/** «@автор · жанр» — только то, что есть в карточке игры. */
function gameMeta(game: GameDto): string {
  const parts = [authorHandle(game.authorId)];
  const genre = game.genreTitles?.[0];
  if (genre) parts.push(genre);
  return parts.join(' · ');
}
