import type { ReactNode } from 'react';
import { Mascot } from '@/components/brand/brand';

/**
 * Пустое состояние по дизайн-системе: кричащий банан + заголовок + одна
 * подпись + один-два выхода.
 *
 * Правила мускота, которые держит компонент:
 * - один банан на экран;
 * - он всегда обрезан краем контейнера (`overflow-hidden` + отрицательный
 *   отступ), а не парит в центре пустоты;
 * - наклон только из токенов (`--tilt-b`), размер стикера 96–140 px.
 *
 * В интерфейсе мускот живёт только в пустых состояниях и загрузке —
 * поэтому других мест, где он появляется, быть не должно.
 */
export function EmptyState({
  title,
  text,
  children,
  variant = 'card',
  compact = false,
  className = '',
}: {
  title: string;
  text?: string;
  children?: ReactNode;
  /** card — блок в сетке, panel — пустая сцена на весь кадр. */
  variant?: 'card' | 'panel';
  compact?: boolean;
  className?: string;
}) {
  const size = compact ? 96 : 132;

  if (variant === 'panel') {
    return (
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-8 text-center ${className}`}
      >
        <Mascot
          size={size}
          tilt="b"
          className="absolute top-[62px] right-0 translate-x-[22%]"
        />
        <div className="relative flex w-full max-w-[330px] flex-col items-center gap-3.5">
          <p className="type-title-1 m-0 text-peel-25">{title}</p>
          {text && (
            <p className="type-body-sm m-0 text-peel-300">{text}</p>
          )}
          {children && (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center overflow-hidden rounded-xl border border-line bg-card text-center ${className}`}
    >
      <Mascot
        size={size}
        tilt="b"
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: `${Math.round(size * -0.36)}px`, marginLeft: '14px' }}
      />
      <div
        className={`relative flex w-full max-w-[360px] flex-col items-center gap-3 px-6 ${
          compact ? 'pt-[70px] pb-6' : 'pt-[104px] pb-8'
        }`}
      >
        <p className="type-title-1 m-0 text-ink">{title}</p>
        {text && <p className="type-body-sm m-0 text-ink-soft">{text}</p>}
        {children && (
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
