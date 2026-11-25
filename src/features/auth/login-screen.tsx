'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { api, type ErrorDto } from '@/shared/api/axios-instance';
import { Button, Field, Input } from '@/components/ui/controls';
import { setAccessToken } from '@/shared/lib/auth';

/**
 * Вход по коду — двухшаговая форма: контакт → шесть цифр.
 *
 * Шлюз ждёт `{identifier, type}`, тип выбирает клиент. Код — `input-otp`
 * без внешней зависимости: шесть полей, авто-переход, вставка из буфера,
 * Backspace возвращает назад. После отправки кода — обратный отсчёт до
 * повторной отправки (60 с), ошибки разбираются по машинному коду шлюза,
 * а не по тексту: `CODE_NOT_FOUND_OR_EXPIRED`, `TOO_MANY_REQUESTS`,
 * `VALIDATION_ERROR`, `SERVICE_UNAVAILABLE`, `TIMEOUT`.
 */

type Step = 'identifier' | 'code';
type ContactType = 'email' | 'phone';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

interface Contact {
  identifier: string;
  type: ContactType;
}

export function LoginScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('identifier');
  const [type, setType] = useState<ContactType>('email');
  const [identifier, setIdentifier] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const code = useMemo(() => digits.join(''), [digits]);

  // Обратный отсчёт повторной отправки: тикаем, пока не дойдём до нуля.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  // Фокус на первом поле кода: на телефоне сразу открывается клавиатура.
  useEffect(() => {
    if (step === 'code') boxes.current[0]?.focus();
  }, [step]);

  const sendCode = useCallback(
    async (contact: Contact, silent = false) => {
      setError(null);
      setNotice(null);
      setPending(true);
      try {
        await api.post('/auth/otp/send', contact);
        setStep('code');
        setDigits(Array(CODE_LENGTH).fill(''));
        setCooldown(RESEND_SECONDS);
        if (silent) setNotice('код отправлен ещё раз');
        boxes.current[0]?.focus();
      } catch (err) {
        setError(sendErrorText(err));
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const verify = useCallback(
    async (value: string) => {
      setError(null);
      setNotice(null);
      setPending(true);
      try {
        const { data } = await api.post<{ access_token?: string }>(
          '/auth/otp/verify',
          {
            identifier:
              type === 'phone'
                ? normalizePhone(identifier.trim())
                : identifier.trim(),
            type,
            code: value,
          },
        );
        if (!data.access_token) {
          setError('Шлюз не вернул access-токен — попробуйте ещё раз');
          return;
        }
        setAccessToken(data.access_token);
        router.replace(safeNext());
        router.refresh();
      } catch (err) {
        setError(verifyErrorText(err));
        // Неверный код — чистим поля и возвращаем фокус в первое.
        setDigits(Array(CODE_LENGTH).fill(''));
        boxes.current[0]?.focus();
      } finally {
        setPending(false);
      }
    },
    [router, type, identifier],
  );

  /** Контакт из текущего состояния; ошибку ввода отдаём текстом. */
  function currentContact(): Contact {
    const trimmed = identifier.trim();
    return {
      identifier: type === 'phone' ? normalizePhone(trimmed) : trimmed,
      type,
    };
  }

  function submitIdentifier(): void {
    setError(null);
    const contact = currentContact();
    if (contact.identifier === '') {
      setError(type === 'phone' ? 'Укажите номер телефона' : 'Укажите почту');
      return;
    }
    if (type === 'email' && !contact.identifier.includes('@')) {
      setError('почта должна содержать @');
      return;
    }
    if (type === 'phone' && !/^\d{10,15}$/.test(contact.identifier)) {
      setError('Телефон — только цифры, 10–15 штук');
      return;
    }
    void sendCode(contact);
  }

  /** Ввод цифры в поле; при заполнении последнего — сразу проверяем. */
  function setDigit(index: number, raw: string): void {
    const digit = raw.replace(/\D+/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit === '') return;
    if (index < CODE_LENGTH - 1) boxes.current[index + 1]?.focus();
    const candidate = next.join('');
    if (candidate.length === CODE_LENGTH) void verify(candidate);
  }

  /** Вставка из буфера: раскидываем цифры по полям. */
  function pasteCode(raw: string): void {
    const clean = raw.replace(/\D+/g, '').slice(0, CODE_LENGTH);
    if (clean === '') return;
    const next = Array(CODE_LENGTH)
      .fill('')
      .map((_, index) => clean[index] ?? '');
    setDigits(next);
    const last = Math.min(clean.length, CODE_LENGTH) - 1;
    boxes.current[last]?.focus();
    if (clean.length === CODE_LENGTH) void verify(clean);
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      boxes.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      boxes.current[index + 1]?.focus();
    }
  }

  return (
    <section className="flex min-h-full items-start justify-center px-4 pt-6 pb-24 dt:items-center dt:pt-0">
      <div className="w-full max-w-[420px] rounded-xl border border-line bg-raised p-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-title-1 leading-title font-black tracking-display text-ink">
            {step === 'identifier' ? 'вход в hookster' : 'код из письма'}
          </h1>
          <p className="text-caption leading-body text-ink-soft">
            {step === 'identifier'
              ? 'пришлём шестизначный код на почту или телефон — пароль не нужен'
              : `код ушёл на ${identifier.trim()}. он живёт несколько минут`}
          </p>
        </div>

        {step === 'identifier' ? (
          <form
            className="mt-5 flex flex-col gap-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              submitIdentifier();
            }}
          >
            <div
              role="tablist"
              aria-label="куда прислать код"
              className="flex gap-2"
            >
              <TypeTab active={type === 'email'} onClick={() => setType('email')}>
                почта
              </TypeTab>
              <TypeTab active={type === 'phone'} onClick={() => setType('phone')}>
                телефон
              </TypeTab>
            </div>

            <Field
              label={type === 'email' ? 'почта' : 'телефон'}
              hint={
                type === 'email'
                  ? 'код придёт письмом, пароль не нужен'
                  : 'в формате 79123456789'
              }
            >
              <Input
                type={type === 'email' ? 'email' : 'tel'}
                inputMode={type === 'email' ? 'email' : 'tel'}
                autoComplete={type === 'email' ? 'email' : 'tel'}
                autoFocus
                placeholder={type === 'email' ? 'you@example.com' : '79123456789'}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </Field>

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'отправляем…' : 'получить код'}
            </Button>
          </form>
        ) : (
          <form
            className="mt-5 flex flex-col gap-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length !== CODE_LENGTH) {
                setError('введи все шесть цифр');
                return;
              }
              void verify(code);
            }}
          >
            <div
              className="flex justify-between gap-1.5"
              role="group"
              aria-label="код из шести цифр"
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    boxes.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event)}
                  onPaste={(event) => {
                    event.preventDefault();
                    pasteCode(event.clipboardData.getData('text'));
                  }}
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  disabled={pending}
                  aria-label={`цифра ${index + 1}`}
                  className="h-[56px] w-full min-w-0 rounded-md border border-line bg-peel-950 text-center font-mono text-title-2 font-bold text-ink transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-lime-300 focus:shadow-glow-strong focus:outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={pending || code.length !== CODE_LENGTH}
              className="h-[50px] rounded-pill bg-acid text-body font-extrabold text-on-acid transition-[background,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.94] disabled:pointer-events-none disabled:opacity-60"
            >
              {pending ? 'проверяем…' : 'войти'}
            </button>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('identifier');
                  setDigits(Array(CODE_LENGTH).fill(''));
                  setError(null);
                  setNotice(null);
                  setCooldown(0);
                }}
                className="font-mono text-caption text-ink-mute transition-colors duration-[var(--dur-fast)] hover:text-ink"
              >
                изменить контакт
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || pending}
                onClick={() => void sendCode(currentContact(), true)}
                className="font-mono text-caption text-ink-mute transition-colors duration-[var(--dur-fast)] hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cooldown > 0
                  ? `отправить снова через ${cooldown} с`
                  : 'отправить код снова'}
              </button>
            </div>
          </form>
        )}

        {notice && (
          <p className="mt-3 rounded-md border border-lime-300/40 bg-lime-300/10 p-3 text-caption text-lime-100">
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-hot-300/50 bg-hot-300/10 p-3 text-caption leading-body text-danger"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function TypeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-pill px-3.5 py-2 font-mono text-caption transition-[background,color,transform] duration-[var(--dur-fast)] active:scale-[0.96] ${
        active
          ? 'bg-hover-strong font-bold text-ink'
          : 'bg-hover text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** Телефон приводим к цифрам: привычную 8 в начале меняем на 7. */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

/** Машинный код ошибки шлюза, если он есть. */
function errorCode(error: unknown): string {
  if (!axios.isAxiosError<ErrorDto>(error)) return '';
  return error.response?.data?.error?.code ?? '';
}

/** Ошибка отправки кода — по коду шлюза, а не по тексту. */
function sendErrorText(error: unknown): string {
  switch (errorCode(error)) {
    case 'VALIDATION_ERROR':
      return 'проверь адрес: почта или телефон введены неверно';
    case 'TOO_MANY_REQUESTS':
      return 'слишком много попыток — подожди минуту';
    case 'SERVICE_UNAVAILABLE':
      return 'сервис входа недоступен — попробуй позже';
    case 'TIMEOUT':
      return 'сервис не ответил вовремя — попробуй ещё раз';
    default:
      return axios.isAxiosError(error) && !error.response
        ? 'нет связи с сервером — проверь сеть'
        : 'не удалось отправить код';
  }
}

/** Ошибка проверки кода: истёкший код и лимит попыток — разные советы. */
function verifyErrorText(error: unknown): string {
  switch (errorCode(error)) {
    case 'CODE_NOT_FOUND_OR_EXPIRED':
      return 'код не подошёл или истёк. проверь цифры или запроси новый';
    case 'VALIDATION_ERROR':
      return 'код из шести цифр — без пробелов и букв';
    case 'TOO_MANY_REQUESTS':
      return 'слишком много попыток — подожди минуту';
    case 'SERVICE_UNAVAILABLE':
      return 'сервис входа недоступен — попробуй позже';
    case 'TIMEOUT':
      return 'сервис не ответил вовремя — попробуй ещё раз';
    default:
      return axios.isAxiosError(error) && !error.response
        ? 'нет связи с сервером — проверь сеть'
        : 'не удалось войти';
  }
}

/** Возврат после входа: только внутренний путь, без open redirect. */
function safeNext(): string {
  if (typeof window === 'undefined') return '/profile';
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/profile';
  }
  return next;
}
