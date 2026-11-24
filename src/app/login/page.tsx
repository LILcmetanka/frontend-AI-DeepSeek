'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/shared/api/axios-instance';

type Step = 'send' | 'verify';

/**
 * Вход по коду: email или телефон → OTP → access-токен в localStorage.
 * Refresh-куку ставит шлюз, обновление токена делает /auth/refresh.
 */
export default function LoginPage() {
  const [step, setStep] = useState<Step>('send');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function sendCode(): Promise<void> {
    setError(null);
    try {
      await api.post('/auth/otp/send', {
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      });
      setStep('verify');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function verify(): Promise<void> {
    setError(null);
    try {
      const { data } = await api.post<{ access_token: string }>(
        '/auth/otp/verify',
        {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          code,
        },
      );
      window.localStorage.setItem('accessToken', data.access_token);
      window.location.href = '/profile';
    } catch (err) {
      setError(errorMessage(err));
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Телефон (только цифры)</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </label>
          <button className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950">
            Получить код
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
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-400">Код из письма или SMS</span>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 tracking-widest"
            />
          </label>
          <button className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950">
            Войти
          </button>
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
