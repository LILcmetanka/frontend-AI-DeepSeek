'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@/components/ui/icons';
import {
  applyTheme,
  isTheme,
  nextTheme,
  readTheme,
  writeTheme,
  DEFAULT_THEME,
  type Theme,
} from '@/shared/lib/theme';

/**
 * Переключатель темы из сайдбара: иконка солнца/луны, без подписи.
 * Иконка показывает, куда переключимся: в тёмной теме — солнце.
 *
 * Доступность: это кнопка с `aria-pressed`, а не чекбокс — состояние темы
 * объявляется текстом (`светлая тема включена`).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  // Тему ставит скрипт в <head>; после монтирования просто читаем её,
  // чтобы не разойтись с разметкой сервера.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(isTheme(current) ? current : (readTheme() ?? DEFAULT_THEME));
  }, []);

  const label = theme === 'dark' ? 'включить светлую тему' : 'включить тёмную тему';

  function toggle(): void {
    const target = nextTheme(theme);
    setTheme(target);
    applyTheme(target);
    writeTheme(target);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={theme === 'light'}
      data-theme-toggle
      className={`grid h-10 w-10 flex-none place-items-center rounded-md bg-hover text-ink-soft transition-[background,color,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-hover-strong hover:text-ink focus-visible:shadow-glow-strong focus-visible:outline-none active:scale-[0.94] ${className}`}
    >
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
