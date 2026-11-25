import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

/**
 * Компоненты дизайн-системы Hookster (design/…/guidelines/).
 *
 * Специмены задают не «стиль на глаз», а точные значения: виды кнопок,
 * четыре размера, анатомию поля, поле промпта, чипы и сообщения. Всё это
 * живёт здесь, чтобы один и тот же CTA не выглядел по-разному на экранах.
 *
 * Почему не отдельная библиотека: фронт без лишних зависимостей, а набор
 * маленький — хватает одного файла.
 */

/* ============================== КНОПКИ ============================== */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'banana'
  | 'danger'
  | 'link'
  | 'sticker';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg';

const VARIANT: Record<ButtonVariant, string> = {
  // одна лаймовая primary на экран — единственный сигнал «здесь можно нажать»
  primary:
    'bg-acid text-on-acid hover:bg-acid-hi hover:-translate-y-0.5 hover:shadow-glow',
  secondary: 'bg-hover text-ink hover:bg-hover-strong hover:-translate-y-0.5',
  outline:
    'bg-transparent text-ink shadow-[inset_0_0_0_2px_var(--color-line-strong)] hover:shadow-[inset_0_0_0_2px_var(--color-accent-line)] hover:text-accent hover:-translate-y-0.5',
  ghost: 'bg-transparent text-ink-soft hover:bg-hover hover:text-ink',
  banana: 'bg-banana text-on-acid hover:bg-banana-200 hover:-translate-y-0.5',
  danger: 'bg-danger text-on-acid hover:brightness-110 hover:-translate-y-0.5',
  link: 'bg-transparent p-0 text-accent underline decoration-2 underline-offset-4 hover:decoration-accent',
  sticker: 'bg-lime-300 text-on-acid shadow-stick hover:-translate-y-0.5',
};

/** Размеры из специмена: sm 32 / md 42 / lg 54 / xl 62, иконочные — круг. */
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-[12px]',
  md: 'h-[42px] px-[18px] text-[14px]',
  lg: 'h-[54px] px-[26px] text-[16px]',
  xl: 'h-[62px] px-8 text-[19px]',
  icon: 'h-[42px] w-[42px] px-0',
  'icon-sm': 'h-8 w-8 px-0',
  'icon-lg': 'h-[54px] w-[54px] px-0',
};

/**
 * Классы кнопки. Отдельная функция нужна ссылкам (`next/link`), которые
 * должны выглядеть как кнопка: классы обязаны совпадать один в один.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return [
    'inline-flex flex-none items-center justify-center gap-1.5 rounded-pill font-extrabold whitespace-nowrap',
    'transition-[background,color,transform,box-shadow] duration-[var(--dur-fast)]',
    'focus-visible:shadow-glow-strong focus-visible:outline-none',
    'active:scale-[0.94] disabled:pointer-events-none disabled:opacity-50',
    variant === 'link' ? '' : SIZE[size],
    variant === 'link' ? 'text-body-sm' : '',
    VARIANT[variant],
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

/* ============================== ПОЛЕ ============================== */

/**
 * Анатомия поля из системы: Label (Manrope 700/13) → Input (14, радиус 14,
 * рамка 2) → Hint (JB Mono 11). Ошибка заменяет подсказку и красит рамку;
 * лейбл при этом не краснеет.
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`} htmlFor={htmlFor}>
      <span className="text-[13px] leading-[1.2] font-bold text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="flex items-start gap-1.5 font-mono text-micro leading-[1.35] text-danger">
          <svg viewBox="0 0 24 24" aria-hidden className="mt-px h-[13px] w-[13px] flex-none" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </span>
      ) : (
        hint && (
          <span className="font-mono text-micro leading-[1.35] text-ink-mute">{hint}</span>
        )
      )}
    </label>
  );
}

const INPUT_BASE =
  'w-full rounded-md border-2 border-line bg-input px-3.5 py-2.5 text-body-sm font-medium text-ink outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] placeholder:text-ink-mute hover:border-line-strong focus:border-lime-300 focus:shadow-glow-strong disabled:cursor-not-allowed disabled:bg-hover disabled:text-ink-mute';

export function Input({
  invalid = false,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={`${INPUT_BASE} ${invalid ? 'border-danger focus:border-danger focus:shadow-none' : ''} ${className}`}
      {...props}
    />
  );
}

/* ============================== ПОЛЕ ПРОМПТА ============================== */

/**
 * Ключевой компонент продукта: моно-шрифт, кислотная рамка и свечение в
 * фокусе, счётчик символов, кнопка «ремикс» внутри поля.
 */
export function PromptField({
  value,
  onChange,
  maxLength = 500,
  placeholder,
  action,
  footer,
  className = '',
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative rounded-lg border-2 border-lime-300 bg-input transition-shadow duration-[var(--dur-fast)] focus-within:shadow-glow-strong">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full resize-none rounded-[12px] bg-transparent px-4 pt-3.5 pb-12 font-mono text-body-sm leading-body text-ink outline-none placeholder:text-ink-mute"
          {...props}
        />
        <div className="pointer-events-none absolute inset-x-3.5 bottom-2.5 flex items-center justify-between gap-3">
          <span className="font-mono text-micro text-ink-mute tabular-nums" data-prompt-counter>
            {value.length} / {maxLength}
          </span>
          <div className="pointer-events-auto">{action}</div>
        </div>
      </div>
      {footer && <div className="flex flex-wrap gap-2">{footer}</div>}
    </div>
  );
}

/* ============================== ЧИПЫ И БЕЙДЖИ ============================== */

export function Chip({
  active = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-pill px-3.5 py-[9px] font-mono text-caption transition-[background,color,transform] duration-[var(--dur-fast)] focus-visible:shadow-glow-strong focus-visible:outline-none active:scale-[0.96] ${
        active
          ? 'bg-lime-300 font-bold text-on-acid'
          : 'bg-hover text-ink-soft hover:bg-hover-strong hover:text-ink'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export type BadgeTone = 'live' | 'new' | 'beta' | 'neutral';

const BADGE: Record<BadgeTone, string> = {
  live: 'bg-danger text-on-acid',
  new: 'bg-lime-300 text-on-acid',
  beta: 'bg-banana text-on-acid',
  neutral: 'bg-hover text-ink-soft',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-[3px] font-mono text-micro font-bold tracking-caps uppercase ${BADGE[tone]}`}
    >
      {children}
    </span>
  );
}

/* ============================== СООБЩЕНИЯ ============================== */

export type MessageTone = 'error' | 'success' | 'warning' | 'info';

const MESSAGE: Record<MessageTone, { box: string; icon: string }> = {
  error: { box: 'border-danger', icon: 'text-danger' },
  success: { box: 'border-success', icon: 'text-success' },
  warning: { box: 'border-warning', icon: 'text-warning' },
  info: { box: 'border-line-strong', icon: 'text-ink-soft' },
};

/**
 * Плашку целиком в цвет не красим: цветом отмечены только иконка и рамка.
 */
export function Message({ tone = 'error', children }: { tone?: MessageTone; children: ReactNode }) {
  const style = MESSAGE[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-md border-2 bg-raised px-3.5 py-2.5 text-body-sm leading-body text-ink ${style.box}`}
    >
      <span className={`mt-px flex-none ${style.icon}`} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          {tone === 'success' ? (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12.5 2.5 2.5 4.5-5" />
            </>
          ) : tone === 'warning' ? (
            <>
              <path d="m12 3 9.5 17h-19z" />
              <path d="M12 9v4M12 17h.01" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </>
          )}
        </svg>
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
