import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Иконки взяты из макета Hookster (design/gaming-feed-design): те же
 * контуры lucide, что в разметке дизайнера. Стороннюю библиотеку иконок
 * не подключаем — нужен десяток глифов.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

export function HeartIcon({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      {...stroke}
      fill={filled ? 'currentColor' : 'none'}
      {...props}
    >
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
    </svg>
  );
}

export function CommentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}

export function WandIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
      <path d="m14 7 3 3" />
      <path d="M5 6v4" />
      <path d="M19 14v4" />
      <path d="M10 2v2" />
      <path d="M7 8H3" />
      <path d="M21 16h-4" />
      <path d="M11 3H9" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

/** Шестерёнка из шапки профиля в макете. */
export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

/** Знак бренда: «крючок»-банан из макета (assets/logo/hookster-mark-lime.svg). */
export function HooksterMark(props: IconProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden fill="currentColor" {...props}>
      <path d="M22.58 9.00C20.54 10.18 17.75 14.03 16.40 16.74C15.05 19.45 14.89 22.38 14.47 25.26C14.05 28.14 13.89 31.10 13.89 34.04C13.89 36.98 14.09 39.96 14.46 42.91C14.83 45.86 15.38 48.82 16.10 51.73C16.83 54.64 17.73 57.54 18.79 60.37C19.85 63.20 21.08 66.00 22.46 68.70C23.85 71.41 25.40 74.07 27.09 76.61C28.78 79.15 30.63 81.62 32.60 83.97C34.58 86.31 36.70 88.56 38.94 90.66C41.17 92.76 43.55 94.75 46.01 96.58C48.47 98.41 51.06 100.10 53.72 101.62C56.38 103.14 59.15 104.52 61.96 105.69C64.77 106.87 67.68 107.89 70.60 108.69C73.53 109.50 76.53 110.13 79.52 110.51C82.51 110.90 85.55 111.12 88.55 111.00C91.55 110.88 94.59 111.16 97.52 109.80C100.45 108.44 104.68 105.38 106.11 102.85C107.54 100.31 107.19 97.23 106.11 94.57C105.04 91.92 101.72 88.74 99.66 86.92C97.59 85.09 95.64 84.67 93.71 83.62C91.78 82.57 89.92 81.63 88.09 80.63C86.26 79.64 84.48 78.65 82.74 77.63C80.99 76.61 79.29 75.58 77.62 74.51C75.95 73.44 74.33 72.34 72.73 71.20C71.14 70.06 69.58 68.89 68.05 67.68C66.53 66.46 65.04 65.21 63.59 63.92C62.13 62.62 60.71 61.28 59.33 59.90C57.95 58.51 56.61 57.08 55.30 55.60C54.00 54.13 52.73 52.60 51.51 51.02C50.28 49.45 49.10 47.82 47.96 46.14C46.82 44.46 45.72 42.74 44.68 40.95C43.63 39.17 42.62 37.34 41.67 35.45C40.71 33.56 39.81 31.62 38.93 29.62C38.06 27.63 37.26 25.58 36.43 23.47C35.61 21.35 35.27 19.24 33.98 16.94C32.68 14.64 30.56 10.96 28.67 9.64C26.77 8.32 24.63 7.82 22.58 9.00Z" />
    </svg>
  );
}

/** Лицо-мускот для аватара автора (assets/logo/hookster-face-ink.svg). */
export function HooksterFace(props: IconProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden fill="currentColor" {...props}>
      <circle cx="41" cy="30" r="9.5" />
      <circle cx="78" cy="24" r="9.5" />
      <g transform="translate(0 14)">
        <path d="M10.00 43.66C9.55 45.48 10.21 49.21 11.01 51.48C11.81 53.76 13.40 55.47 14.83 57.31C16.25 59.14 17.85 60.87 19.54 62.50C21.22 64.13 23.04 65.66 24.93 67.08C26.83 68.50 28.83 69.82 30.90 71.02C32.97 72.21 35.13 73.30 37.34 74.26C39.54 75.22 41.83 76.06 44.15 76.77C46.46 77.47 48.84 78.05 51.24 78.49C53.63 78.93 56.07 79.24 58.50 79.40C60.94 79.56 63.40 79.59 65.84 79.47C68.29 79.36 70.74 79.10 73.15 78.70C75.56 78.30 77.97 77.75 80.31 77.07C82.65 76.39 84.97 75.56 87.20 74.60C89.43 73.64 91.62 72.54 93.70 71.31C95.78 70.08 97.80 68.71 99.68 67.21C101.55 65.71 103.36 64.08 104.96 62.30C106.55 60.51 108.39 58.93 109.23 56.50C110.07 54.07 110.66 49.95 110.00 47.73C109.34 45.50 107.38 44.00 105.26 43.15C103.14 42.29 99.49 42.43 97.30 42.61C95.11 42.78 93.79 43.67 92.12 44.19C90.45 44.72 88.88 45.27 87.30 45.76C85.71 46.26 84.17 46.73 82.62 47.17C81.07 47.60 79.53 48.01 78.00 48.37C76.46 48.73 74.93 49.06 73.39 49.34C71.86 49.63 70.33 49.87 68.79 50.07C67.25 50.27 65.71 50.44 64.16 50.55C62.61 50.67 61.06 50.74 59.50 50.76C57.95 50.79 56.38 50.77 54.81 50.70C53.24 50.63 51.67 50.51 50.09 50.34C48.50 50.17 46.92 49.95 45.33 49.67C43.73 49.39 42.14 49.07 40.54 48.68C38.93 48.30 37.33 47.86 35.72 47.36C34.11 46.86 32.49 46.31 30.87 45.70C29.24 45.10 27.62 44.42 25.95 43.73C24.28 43.03 22.89 42.06 20.85 41.52C18.82 40.99 15.54 40.17 13.73 40.53C11.92 40.88 10.45 41.83 10.00 43.66Z" />
      </g>
    </svg>
  );
}
