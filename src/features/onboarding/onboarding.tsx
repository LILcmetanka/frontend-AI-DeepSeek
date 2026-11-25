'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDownIcon,
  HooksterMark,
  WandIcon,
} from '@/components/ui/icons';

/**
 * Онбординг — макет «09 Onboarding», но в честном объёме: два шага вместо
 * трёх.
 *
 * - Шага «выбери жанры» нет: `GET /feed` не фильтруется по жанру, и выбор
 *   ни на что бы не повлиял (ADR-0036).
 * - Входа через Apple и Google нет: авторизация только по коду на почту
 *   (`/login`), поэтому на первом шаге — «войти по почте» вместо трёх кнопок.
 *
 * Показывается один раз: флаг в `localStorage`, ключ с версией — новый
 * онбординг сможет показаться снова, старый не всплывёт.
 */

const STORAGE_KEY = 'hookster:onboarding-v1';

/** Показан ли онбординг раньше (безопасно и на сервере, и в браузере). */
export function wasOnboardingShown(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'done';
  } catch {
    // Приватный режим: считаем, что показан, — иначе он будет вечным.
    return true;
  }
}

function rememberOnboarding(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'done');
  } catch {
    // см. wasOnboardingShown
  }
}

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    rememberOnboarding();
    onDone?.();
  }, [onDone]);

  // Escape закрывает: онбординг не должен запирать в ленте.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    cardRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-overlay px-4 backdrop-blur-[6px]">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="знакомство с Hookster"
        tabIndex={-1}
        data-onboarding-step={step}
        className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-[360px] flex-col gap-5 overflow-y-auto rounded-xl bg-peel-900 p-8 shadow-pop outline-none"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            background:
              'linear-gradient(160deg, rgba(198,255,46,0.16), rgba(6,6,3,0) 55%)',
          }}
        />

        <div className="relative flex gap-[5px]">
          <span className="h-1 flex-1 rounded-pill bg-lime-300" />
          <span
            className={`h-1 flex-1 rounded-pill ${step === 1 ? 'bg-lime-300' : 'bg-hover-strong'}`}
          />
        </div>

        {step === 0 ? (
          <>
            <div className="relative flex flex-col gap-3.5 pt-8">
              <HooksterMark className="h-[52px] w-[52px] text-accent" />
              <h2 className="font-display text-display-3 leading-title font-black tracking-display text-peel-25">
                игры, которые
                <br />
                делаешь свайпом
              </h2>
              <p className="text-body-sm leading-body font-medium text-peel-300">
                смотри чужие, жми ремикс, получай свою версию через пару минут
              </p>
            </div>

            <div className="relative mt-auto flex flex-col gap-2.5 pt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-[52px] rounded-pill bg-lime-300 text-body font-extrabold text-on-acid transition-[background,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-lime-200 active:scale-[0.94]"
              >
                начать
              </button>
              <Link
                href="/login"
                onClick={close}
                className="flex h-[52px] items-center justify-center rounded-pill border-2 border-line-strong text-body font-bold text-peel-25 transition-colors duration-[var(--dur-fast)] hover:border-lime-300 hover:text-lime-300 active:scale-[0.94]"
              >
                войти по почте
              </Link>
              <button
                type="button"
                onClick={close}
                className="p-1.5 font-mono text-caption text-peel-300 transition-colors duration-[var(--dur-fast)] hover:text-peel-25"
              >
                пропустить
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative flex flex-col items-center gap-4 pt-6 text-center">
              <ChevronDownIcon className="h-[34px] w-[34px] text-lime-300" />
              <h2 className="font-display text-title-1 leading-title font-extrabold tracking-display text-peel-25">
                свайп — следующая игра
              </h2>
              <p className="text-body-sm leading-body font-medium text-peel-100">
                тап — играть. кнопка ремикса всегда справа
              </p>
              <div className="mt-1 flex items-center gap-2.5 rounded-pill bg-overlay px-3.5 py-2.5">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-pill bg-lime-300 text-on-acid">
                  <WandIcon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-mono text-micro font-bold tracking-caps text-peel-25 uppercase">
                  вот эта
                </span>
              </div>
            </div>

            <div className="relative mt-auto pt-6">
              <button
                type="button"
                onClick={close}
                className="h-[52px] w-full rounded-pill bg-lime-300 text-body font-extrabold text-on-acid transition-[background,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-lime-200 active:scale-[0.94]"
              >
                поехали
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
