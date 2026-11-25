/**
 * Тема продукта: по умолчанию тёмная, светлая — `data-theme="light"` на
 * `<html>`. Так же устроена дизайн-система (`tokens/colors.css`): переключение
 * меняет только значения токенов, вёрстка и размеры остаются прежними.
 *
 * Состояние живёт в localStorage под своим ключом: вместе с онбордингом
 * (`hookster:onboarding-v1`) и сессией (`hookster:last-session`) — в общем
 * пространстве `hookster:*`, чтобы не сталкиваться с чужими ключами.
 */

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'hookster:theme';
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

/** Сохранённая тема или null, если её нет либо доступ закрыт. */
export function readTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // Приватный режим — тема останется по умолчанию, ошибку не шумим.
    return null;
  }
}

export function writeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // см. readTheme
  }
}

/** Ставит тему на `<html>`; атрибут читают токены в globals.css. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

/**
 * Скрипт первого кадра: ставит атрибут до отрисовки, иначе при светлой теме
 * страница мигнёт тёмным. Вставляется в `<head>` из layout.tsx.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark')t='${DEFAULT_THEME}';var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='${DEFAULT_THEME}';}})();`;
