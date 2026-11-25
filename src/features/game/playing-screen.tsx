'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckIcon,
  HooksterFace,
} from '@/components/ui/icons';
import { GameOverlays } from '@/features/game/game-overlays';
import {
  errorMessage,
  isNetworkError,
  isUnauthorized,
  sendEvent,
  type GameDto,
} from '@/shared/api/axios-instance';
import { authorHandle } from '@/shared/lib/author';
import { getGameCached } from '@/shared/lib/game-cache';
import { GamePlayer, type PlayerEvent } from '@/shared/lib/game-player';
import { readOfflineGame, saveOfflineGame } from '@/shared/lib/offline-games';
import { formatDuration, saveSessionResult } from '@/shared/lib/session-result';
import { useGameLikes } from '@/shared/lib/use-game-likes';
import { useOnline } from '@/shared/lib/use-online';
import { ConnectionLost } from '@/components/ui/connection-lost';

/**
 * Экран игры — макет «02 Playing»: игра забрала экран, интерфейс ужат до HUD.
 *
 * Что на экране есть и откуда взято:
 * - рамка плеера — тот же `.feed-frame`, что у ленты, игра занимает её целиком;
 * - таймер сессии — наши собственные часы с момента открытия экрана;
 * - название, автор, описание, жанр — `GET /feed/{gameId}`;
 * - оверлеи справа — тот же `GameOverlays`, что в ленте (лайк, шер, ремикс);
 * - «назад» — возврат в ленту.
 *
 * Чего нет — того не рисуем: счёта (движок присылает его только вместе с
 * `play_finish`, живого счёта в протоколе нет), рекорда, комбо, жизней и
 * кнопки паузы (в мосте нет `pause`, а делать вид, что игра замерла, нельзя).
 * Полоса прогресса в макете тоже без источника: лимита сессии не существует.
 *
 * Сессия пишется в sessionStorage (`session-result.ts`) — из неё экран итога
 * берёт время и, если движок прислал, очки.
 */

// Адреса вшиваются в бандл при сборке: это NEXT_PUBLIC_*, браузер ходит
// на хост, а не на имя контейнера.
const GAME_URL = (process.env.NEXT_PUBLIC_GAME_URL ?? '').trim();
const SPRITE_BASE_URL = (process.env.NEXT_PUBLIC_SPRITE_BASE_URL ?? '').trim();

export function PlayingScreen({ gameId }: { gameId: string }) {
  // FU_0007: сначала локальная копия шаблона, на сервер — если её нет
  // или она устарела. Ключ тот же, что у prefetch в ленте.
  const game = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGameCached(gameId),
    retry: false,
  });

  const data: GameDto | undefined = game.data;
  const { likedIds, toggleLike } = useGameLikes(`/feed/${gameId}`);
  const online = useOnline();

  // Офлайн-копия пакета: читается после монтирования — localStorage на
  // сервере нет. Плеер использует её, только если сеть не отдала код.
  const [offlineCode, setOfflineCode] = useState<string | null>(null);
  useEffect(() => {
    setOfflineCode(readOfflineGame(gameId)?.code ?? null);
  }, [gameId]);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Часы и данные держим в ref: событие игры и выгрузка страницы читают
  // последнее состояние, не пересоздавая обработчики.
  const startedAtRef = useRef<number>(Date.now());
  const dataRef = useRef<GameDto | undefined>(undefined);
  const scoreRef = useRef<number | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  dataRef.current = data;

  useEffect(() => {
    const tick = () =>
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const handlePlayerEvent = useCallback((event: PlayerEvent) => {
    // Очки приходят только с завершением сессии — запоминаем, что было.
    if (typeof event.score === 'number') scoreRef.current = event.score;
    const current = dataRef.current;
    if (!current) return;
    // Метрики не должны ломать игру: ошибку отправки только пишем в консоль.
    void sendEvent({
      userId: current.authorId,
      gameId: current.gameId,
      type: event.type,
      durationSec: event.durationSec,
    }).catch((error: unknown) => {
      console.warn('Не удалось отправить событие игры:', error);
    });
  }, []);

  /** Итог сессии — на выходе и при закрытии вкладки/уходе с экрана. */
  const saveResult = useCallback(() => {
    const current = dataRef.current;
    if (!current) return;
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 1000),
    );
    saveSessionResult({
      gameId: current.gameId,
      title: current.title,
      authorId: current.authorId,
      durationSec,
      ...(scoreRef.current !== undefined ? { score: scoreRef.current } : {}),
      finishedAt: Date.now(),
    });
  }, []);

  useEffect(() => {
    window.addEventListener('pagehide', saveResult);
    return () => {
      window.removeEventListener('pagehide', saveResult);
      saveResult();
    };
  }, [saveResult]);

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

  const title = data?.title || 'Игра';
  const genre = data?.genreTitles?.[0];
  const author = data ? authorHandle(data.authorId) : '';

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-stage dt:p-6">
      <div className="feed-frame">
        <div className="absolute inset-0 bg-peel-950" />

        {data && GAME_URL && (
          <GamePlayer
            fill
            onReady={(readyMs) => {
              // NF_0001: замер готовности виден в консоли; сравнение с порогом
              // 1000/3000 мс — по нему и проверяем ТЗ.
              console.info(`[NF_0001] игра готова за ${readyMs} мс`);
            }}
            gameId={data.gameId}
            userId={data.authorId}
            config={data.config}
            gameUrl={GAME_URL}
            // FU_0006: если в карточке пакет (index.js), плеер запускает его
            // в песочнице; встроенная сборка — запасной вариант.
            codeUrl={data.codeUrl}
            codeIntegrity={data.codeIntegrity}
            spriteBaseUrl={SPRITE_BASE_URL}
            engineMinVersion={data.engineMinVersion}
            initialCode={offlineCode ?? undefined}
            onPackageCode={(code) => {
              setOfflineCode(code);
              if (dataRef.current) {
                // Макет 08: последние две сыгранные игры доступны без сети.
                saveOfflineGame(dataRef.current, code);
              }
            }}
            onEvent={handlePlayerEvent}
          />
        )}

        {/* Верхнее затемнение: HUD читается на любом кадре игры. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[130px]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(6,6,3,0.78), rgba(6,6,3,0))',
          }}
        />

        <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-2.5 p-4">
          <Link
            href={`/feed/${gameId}/result`}
            aria-label="выход: итог сессии"
            className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-[rgba(6,6,3,0.55)] text-peel-25 backdrop-blur-[12px] transition-[background,transform] duration-150 hover:bg-[rgba(6,6,3,0.78)] active:scale-[0.94]"
          >
            <ArrowLeftIcon className="h-[19px] w-[19px]" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="scrim-text truncate font-display text-[15px] leading-[1.15] font-extrabold tracking-[-0.02em] text-peel-25">
              {title}
            </p>
            {author && (
              <p className="scrim-text truncate font-mono text-[11px] text-peel-300">
                {author}
              </p>
            )}
          </div>

          {/*
            Таймер — время с открытия экрана, а не «до конца сессии»:
            лимита сессии нет ни в конфиге игры, ни в API.
          */}
          <div className="flex flex-none items-center gap-2">
            <span className="scrim-text font-mono text-[10px] font-bold tracking-[0.12em] text-peel-300 uppercase">
              сессия
            </span>
            <span
              data-session-timer
              className="scrim-text font-mono text-[18px] leading-none font-bold tabular-nums text-lime-300"
            >
              {formatDuration(elapsedSec)}
            </span>
          </div>
        </header>

        {/* Нижнее затемнение под подписью и оверлеями. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[52%]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(6,6,3,0) 0%, rgba(6,6,3,0.55) 45%, rgba(6,6,3,0.92) 100%)',
          }}
        />

        {data ? (
          <div className="absolute inset-x-0 bottom-5 z-20 flex items-end gap-2.5 pr-3 pl-4 max-dt:bottom-[86px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
              <div className="flex min-w-0 items-center gap-[9px]">
                <span className="grid h-[34px] w-[34px] flex-none place-items-center overflow-hidden rounded-pill bg-acid">
                  <HooksterFace className="w-[25px] text-peel-900" />
                </span>
                <span className="scrim-text min-w-0 flex-[0_1_auto] truncate text-[15px] font-extrabold text-peel-25">
                  {author}
                </span>
              </div>

              <h1 className="scrim-title line-clamp-2 font-display text-[22px] leading-[1.06] font-extrabold tracking-[-0.03em] text-peel-25 sm:text-[23px]">
                {title}
              </h1>

              {data.description && (
                <p className="scrim-text line-clamp-1 text-[14px] leading-[1.45] font-medium text-peel-100">
                  {data.description}
                </p>
              )}

              {genre && (
                <div className="flex flex-wrap gap-1.5 pt-px">
                  <span className="rounded-pill bg-[rgba(242,242,232,0.14)] px-2.5 py-[5px] font-mono text-[11px] text-peel-25 backdrop-blur-[8px]">
                    {genre}
                  </span>
                </div>
              )}
            </div>

            <GameOverlays
              gameId={data.gameId}
              title={title}
              liked={likedIds.has(data.gameId)}
              onLike={() => toggleLike(data.gameId)}
              onNotify={notify}
            />
          </div>
        ) : game.isError && isNetworkError(game.error) ? (
          <div className="absolute inset-0 z-20 bg-peel-950/70">
            <ConnectionLost
              onRetry={() => void game.refetch()}
              message="игра не загрузилась: сервер не ответил. если открывали её раньше, повтор возьмёт сохранённую копию"
            />
          </div>
        ) : (
          <div className="absolute inset-0 z-20 grid place-items-center px-8 text-center">
            <div className="flex max-w-[320px] flex-col items-center">
              {game.isLoading && (
                <p className="text-[17px] leading-[1.35] font-bold text-peel-25">
                  Загружаем игру…
                </p>
              )}
              {!game.isLoading && (
                <>
                  <p className="text-[17px] leading-[1.35] font-bold text-peel-25">
                    {isUnauthorized(game.error)
                      ? 'Эта игра доступна после входа'
                      : errorMessage(game.error)}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    {isUnauthorized(game.error) && (
                      <Link
                        href={`/login?next=${encodeURIComponent(`/feed/${gameId}`)}`}
                        className="rounded-pill bg-acid px-5 py-2.5 text-[14px] font-extrabold text-peel-900 transition-colors hover:bg-acid-hi"
                      >
                        войти
                      </Link>
                    )}
                    <Link
                      href="/feed"
                      className="rounded-pill border-2 border-line-strong px-5 py-2.5 text-[14px] font-bold text-peel-25 transition-colors hover:border-acid hover:text-acid"
                    >
                      к ленте
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {data && !GAME_URL && (
          <div className="absolute inset-0 z-20 grid place-items-center px-8">
            <div className="max-w-[320px] rounded-lg border border-banana-500/60 bg-[rgba(23,23,15,0.92)] p-4 text-[13px] leading-[1.5] text-banana-200">
              Плеер не настроен: не задан <code>NEXT_PUBLIC_GAME_URL</code>.
              Игра не запускается, но карточка и метаданные на месте.
            </div>
          </div>
        )}

        {!online && data && (
          <div
            data-offline-banner
            className="absolute top-[68px] left-1/2 z-40 -translate-x-1/2 rounded-pill bg-peel-25 px-4 py-2 font-mono text-[11px] font-bold whitespace-nowrap text-peel-900 shadow-pop"
          >
            офлайн — сохранённая копия
          </div>
        )}

        {toast && (
          <div className="animate-toast absolute top-[74px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-peel-25 px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-peel-900 shadow-pop">
            <CheckIcon className="h-4 w-4 text-lime-600" />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
