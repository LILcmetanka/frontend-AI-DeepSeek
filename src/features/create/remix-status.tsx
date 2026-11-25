'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertIcon, CheckIcon, WifiOffIcon } from '@/components/ui/icons';
import { Mascot } from '@/components/brand/brand';
import type { TaskStatusDto } from '@/shared/api/axios-instance';

/**
 * «Generating your game» — состояние задачи, пока шлюз отвечает PENDING или
 * PROCESSING. Проценты не выдумываем: API отдаёт только состояние, поэтому
 * полоса бежит (hk-fill из макета 06), а рядом честно идёт время с запуска.
 *
 * CL_0004: опрос не чаще раза в 2 секунды — интервал задаёт create-screen.
 */
export function GeneratingPanel({
  state,
  prompt,
  startedAt,
}: {
  state: TaskStatusDto['state'] | undefined;
  prompt: string;
  startedAt: number;
}) {
  const elapsed = useElapsed(startedAt);

  return (
    <section aria-live="polite" className="flex flex-col gap-5">
      <div className="relative flex items-start justify-between gap-4 overflow-hidden">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-micro font-bold tracking-caps text-accent uppercase">
            генерация
          </span>
          <h2 className="m-0 font-display text-title-2 leading-title font-extrabold tracking-display text-ink dt:text-title-1">
            пересобираю твою игру
          </h2>
          <p className="m-0 text-caption leading-body font-medium text-ink-soft dt:text-body-sm">
            механика шаблона останется, ассеты и правила соберутся заново.
            вкладку лучше не закрывать
          </p>
        </div>
        {/* Загрузка — второе и последнее место в интерфейсе, где живёт банан. */}
        <Mascot size={96} tilt="b" className="mt-[-18px] flex-none translate-x-2" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-[18px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 font-mono text-caption text-ink-soft">
            <span aria-hidden className="flex flex-none gap-1">
              {[0, 0.15, 0.3].map((delay) => (
                <span
                  key={delay}
                  className="block h-[5px] w-[5px] animate-dot rounded-pill bg-acid"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </span>
            <span className="truncate">
              {state === 'PENDING' ? 'задача в очереди' : 'собираю новую версию'}
            </span>
          </div>
          <div className="flex-none font-mono text-caption font-bold text-accent tabular-nums">
            {formatClock(elapsed)}
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-pill bg-hover-strong">
          <div className="h-full animate-fill rounded-pill bg-acid" />
        </div>

        <div className="flex flex-col gap-[7px]">
          <Step done label="задача поставлена" />
          <Step
            active
            label={
              state === 'PENDING'
                ? 'жду свободный движок'
                : 'собираю ассеты, правила и уровень'
            }
          />
        </div>
      </div>

      {prompt && (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-micro font-bold tracking-caps text-ink-mute uppercase">
            твой промпт
          </span>
          <p className="m-0 line-clamp-3 rounded-md border border-line bg-input px-3.5 py-3 font-mono text-caption leading-body text-ink-soft">
            {prompt}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="m-0 font-mono text-micro text-ink-mute">
          проверяем состояние каждые 2 секунды
        </p>
        <Link
          href="/feed"
          className="font-mono text-micro font-bold text-ink-soft transition-colors hover:text-ink"
        >
          пока полистать ленту →
        </Link>
      </div>
    </section>
  );
}

/**
 * Карточка неудачи по макету 08: иконка в цветном круге, заголовок,
 * объяснение и пара действий. Одна и та же для ERROR задачи и для
 * оборвавшейся связи — меняются только тексты.
 */
export function RemixFailedCard({
  icon = 'alert',
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  icon?: 'alert' | 'offline';
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <div className="flex min-h-dvh w-full items-start justify-center bg-stage px-4 py-8 pb-24 dt:items-center dt:p-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-xl bg-page px-7 py-9 text-center shadow-pop">
        <span className="grid h-[76px] w-[76px] flex-none place-items-center rounded-pill bg-danger/15">
          {icon === 'offline' ? (
            <WifiOffIcon className="h-[34px] w-[34px] text-danger" />
          ) : (
            <AlertIcon className="h-[34px] w-[34px] text-danger" />
          )}
        </span>

        <h1 className="m-0 font-display text-title-1 leading-title font-extrabold tracking-display text-ink">
          {title}
        </h1>
        <p className="m-0 text-body-sm leading-body font-medium text-ink-soft">
          {message}
        </p>

        <div className="mt-1.5 flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex h-[50px] w-full items-center justify-center rounded-pill bg-acid text-body font-extrabold text-on-acid transition-[background,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.94]"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="inline-flex h-[46px] w-full items-center justify-center rounded-pill border-2 border-line-strong text-body-sm font-bold text-ink transition-[border-color,color,transform] duration-[var(--dur-fast)] hover:border-accent-line hover:text-accent active:scale-[0.94]"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 font-mono text-micro ${
        active ? 'text-ink' : 'text-ink-soft'
      }`}
    >
      {done ? (
        <CheckIcon className="h-[13px] w-[13px] flex-none text-accent" strokeWidth={3.5} />
      ) : (
        <span className="h-[13px] w-[13px] flex-none rounded-pill border-2 border-accent-line" />
      )}
      {label}
    </div>
  );
}

/** Секунды с запуска: только факт, без экстраполяции «сколько осталось». */
function useElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return Math.max(0, Math.round((now - startedAt) / 1000));
}

/** 0:07, 1:48 — как таймер, а не «48 секунд». */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** «готово за 1 мин 48 сек» — длительность в словах, для экрана результата. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(1, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (minutes === 0) return `${rest} сек`;
  if (rest === 0) return `${minutes} мин`;
  return `${minutes} мин ${rest} сек`;
}
