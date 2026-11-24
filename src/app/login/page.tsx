'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/shared/api/axios-instance';
import { setAccessToken } from '@/shared/lib/auth';

type Step = 'send' | 'verify';

interface Contact {
  identifier: string;
  type: 'email' | 'phone';
}

/**
 * Вход по коду: email или телефон → OTP → access-токен в localStorage.
 *
 * Шлюз ждёт `{identifier, type}`, а не `{email}`/`{phone}`: тип выбирает
 * сам клиент, потому что одно и то же поле может быть и тем и другим.
 * Refresh-куку ставит шлюз (HttpOnly), обновление токена — /auth/refresh.
 */
export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('send');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState('');
  const [pending, setPending] = useState(false);

  async function sendCode(): Promise<void> {
    setError(null);

    const contact = buildContact(email, phone);
    if ('error' in contact) {
      setError(contact.error);
      return;
    }

    setPending(true);
    try {
      await api.post('/auth/otp/send', contact);
      setSentTo(contact.identifier);
      setCode('');
      setStep('verify');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function verify(): Promise<void> {
    setError(null);

    const contact = buildContact(email, phone);
    if ('error' in contact) {
      setError(contact.error);
      return;
    }
    if (code.trim() === '') {
      setError('Введите код из письма или SMS');
      return;
    }

    setPending(true);
    try {
      const { data } = await api.post<{ access_token?: string }>(
        '/auth/otp/verify',
        { ...contact, code: code.trim() },
      );

      if (!data.access_token) {
        setError('Шлюз не вернул access-токен');
        return;
      }

      setAccessToken(data.access_token);
      router.replace(safeNext());
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Вход</h1>

      {step === 'send' ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </label>
          <p className="text-center text-xs text-zinc-500">или</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Телефон (только цифры)</span>
            <input
              inputMode="tel"
              autoComplete="tel"
              placeholder="79123456789"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </label>
          <button
            disabled={pending}
            className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950 disabled:opacity-50"
          >
            {pending ? 'Отправляем…' : 'Получить код'}
          </button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
        >
          <p className="text-sm text-zinc-400">
            Код отправлен на <span className="text-zinc-100">{sentTo}</span>
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Код из письма или SMS</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 tracking-widest"
            />
          </label>
          <div className="flex gap-3">
            <button
              disabled={pending}
              className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950 disabled:opacity-50"
            >
              {pending ? 'Проверяем…' : 'Войти'}
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 disabled:opacity-50"
              onClick={() => {
                setStep('send');
                setCode('');
                setError(null);
              }}
            >
              Изменить контакт
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </section>
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

/**
 * Контакт для шлюза. Заполнить нужно ровно одно поле: два сразу — непонятно,
 * куда слать код, а «и email, и телефон» API не принимает.
 */
function buildContact(email: string, phone: string): Contact | { error: string } {
  const trimmedEmail = email.trim();
  const normalizedPhone = normalizePhone(phone);

  if (trimmedEmail !== '' && normalizedPhone !== '') {
    return { error: 'Оставьте что-то одно: email или телефон' };
  }
  if (trimmedEmail !== '') {
    return { identifier: trimmedEmail, type: 'email' };
  }
  if (normalizedPhone !== '') {
    return { identifier: normalizedPhone, type: 'phone' };
  }
  return { error: 'Укажите email или телефон' };
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
