'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  errorMessage,
  updateProfile,
  type UpdateProfilePayload,
} from '@/shared/api/axios-instance';

export interface ProfileValues {
  username?: string | null;
  name?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
}

const USERNAME_ALPHABET = /^[a-zA-Z0-9_]+$/;

/** Дата в UTC, как её сравнивает шлюз: локальная зона могла бы уехать на день. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * DT_0005: форма профиля. Проверки повторяют шлюз, чтобы не гонять заведомо
 * неверный запрос: username 1…255 из латиницы, цифр и «_», name ≤ 255,
 * birth_date не позже сегодняшней, avatar_url ≤ 255.
 * Контракт profile.v1 не умеет очищать поле: пустое значение просто не шлём.
 */
export function ProfileForm({ profile }: { profile: ProfileValues }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(profile.username ?? '');
  const [name, setName] = useState(profile.name ?? '');
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    // Форму не закрываем: иначе сообщение «Профиль сохранён» никто не увидит.
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};

    if (username !== '' && !USERNAME_ALPHABET.test(username)) {
      found.username = 'Только латинские буквы, цифры и подчёркивание';
    } else if (username.length > 255) {
      found.username = 'Не больше 255 символов';
    }

    if (name.length > 255) {
      found.name = 'Не больше 255 символов';
    }

    if (birthDate !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        found.birth_date = 'Дата в формате ГГГГ-ММ-ДД';
      } else if (birthDate > todayUtc()) {
        found.birth_date = 'Дата не может быть позже сегодняшней';
      }
    }

    if (avatarUrl.length > 255) {
      found.avatar_url = 'Не больше 255 символов';
    }

    return found;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    save.reset();

    const found = validate();
    setProblems(found);
    if (Object.keys(found).length > 0) {
      return;
    }

    const payload: UpdateProfilePayload = {};
    if (username !== '') payload.username = username;
    if (name !== '') payload.name = name;
    if (birthDate !== '') payload.birth_date = birthDate;
    if (avatarUrl !== '') payload.avatar_url = avatarUrl;

    if (Object.keys(payload).length === 0) {
      setProblems({ form: 'Заполните хотя бы одно поле' });
      return;
    }

    save.mutate(payload);
  }

  return (
    <form className="space-y-3" onSubmit={submit} noValidate>
      <Field
        label="Логин"
        hint="Латиница, цифры и «_», до 255 символов"
        problem={problems.username}
      >
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
      </Field>

      <Field label="Имя" hint="До 255 символов" problem={problems.name}>
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </Field>

      <Field label="Дата рождения" problem={problems.birth_date}>
        <input
          type="date"
          max={todayUtc()}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </Field>

      <Field
        label="Аватар"
        hint="Ссылка на картинку, до 255 символов"
        problem={problems.avatar_url}
      >
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          inputMode="url"
          placeholder="http://localhost:9000/hookster/avatars/user.png"
        />
      </Field>

      {problems.form && (
        <p className="text-sm text-amber-300">{problems.form}</p>
      )}

      {save.isError && (
        <p className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          {errorMessage(save.error)}
        </p>
      )}

      {saved && !save.isPending && (
        <p className="text-sm text-emerald-400">Профиль сохранён</p>
      )}

      <button
        type="submit"
        disabled={save.isPending}
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
      >
        {save.isPending ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  problem,
  children,
}: {
  label: string;
  hint?: string;
  problem?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-zinc-400">{label}</span>
      {children}
      {problem ? (
        <span className="block text-amber-300">{problem}</span>
      ) : (
        hint && <span className="block text-xs text-zinc-500">{hint}</span>
      )}
    </label>
  );
}
