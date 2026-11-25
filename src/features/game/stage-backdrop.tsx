'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  drawPreviewFrame,
  previewImageUrl,
  sceneFor,
  STILL_FRAME_SECONDS,
  type PreviewScene,
} from '@/shared/lib/game-preview';

/**
 * Фон карточки игры — та же сцена, что в макете (`game-render.js`).
 *
 * Если конфиг несёт настоящий кадр генерации (`preview.url`), карточка
 * показывает его: это картинка из самой игры, а не её имитация. Нет кадра
 * или он не загрузился — рисуем сцену того же вида, что и игра (бегун,
 * леталка, шутер…), — и честно, и не пустой прямоугольник.
 *
 * Когда сцена движется:
 * - в ленте (`animate`) — пока карточка на экране, вкладка активна и
 *   пользователь не просил уменьшить движение (`prefers-reduced-motion`);
 * - везде ещё (сетки профиля и поиска, панели ремикса) — один неподвижный
 *   кадр: тридцать канвасов в сетке с requestAnimationFrame не нужны.
 *
 * Рисунок один на все экраны: разница только в том, идёт ли время.
 */

interface StageBackdropProps {
  gameId: string;
  /** Конфиг игры (`GameDto.config`): по нему выбирается вид сцены и кадр. */
  config?: string | null;
  /** Двигать сцену, пока карточка видна. По умолчанию — статичный кадр. */
  animate?: boolean;
  className?: string;
}

export function StageBackdrop({
  gameId,
  config,
  animate = false,
  className = '',
}: StageBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scene = useMemo<PreviewScene>(() => sceneFor(gameId, config), [gameId, config]);
  const imageUrl = useMemo(() => previewImageUrl(config), [config]);
  // Кадр не загрузился (файла нет, бакет пуст, сеть отвалилась) — остаётся сцена.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl !== null && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frame = 0;
    let startedAt = 0;
    let visible = false;
    let disposed = false;
    // Размер меряем на старте и при ресайзе: getBoundingClientRect каждый
    // кадр заставлял бы браузер пересчитывать раскладку 60 раз в секунду.
    let width = 0;
    let height = 0;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measure = (): void => {
      const rect = canvas.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
    };

    const paint = (seconds: number): void => {
      if (!width || !height) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawPreviewFrame(ctx, width, height, seconds, scene);
    };

    measure();

    const resize =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            measure();
            // В движении следующий кадр сам попадёт в новый размер.
            if (!frame) paint(STILL_FRAME_SECONDS);
          })
        : null;
    resize?.observe(canvas);

    // Статичный кадр: рисуем сразу и перерисовываем при смене размера.
    // Кадр генерации поверх сцены — тоже повод не крутить rAF.
    if (showImage || !animate || reduced) {
      paint(STILL_FRAME_SECONDS);
      return () => {
        disposed = true;
        resize?.disconnect();
      };
    }

    const stop = (): void => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const tick = (now: number): void => {
      if (disposed || !visible || document.visibilityState === 'hidden') {
        frame = 0;
        return;
      }
      if (!startedAt) startedAt = now;
      paint((now - startedAt) / 1000);
      frame = window.requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (frame || !visible) return;
      frame = window.requestAnimationFrame(tick);
    };

    // Сцена идёт, только пока карточка в кадре: в ленте это одна-две карточки.
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              visible = entries.some((entry) => entry.isIntersecting);
              if (visible) {
                startedAt = 0;
                start();
              } else {
                stop();
              }
            },
            { threshold: 0.25 },
          )
        : null;

    if (observer) {
      observer.observe(canvas);
    } else {
      visible = true;
      start();
    }

    // Вкладка в фоне: rAF и так почти не идёт, но останавливаем явно.
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        startedAt = 0;
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      stop();
      observer?.disconnect();
      resize?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [animate, scene, showImage]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {showImage ? (
        // Кадр генерации из S3: настоящая картинка игры. Не загрузился —
        // срабатывает onError, и остаётся нарисованная сцена.
        // eslint-disable-next-line @next/next/no-img-element -- кадр приходит из конфига игры, домен не наш
        <img
          src={imageUrl}
          alt=""
          data-preview-frame
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </div>
  );
}
