'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckIcon, CloseIcon } from '@/components/ui/icons';
import {
  errorMessage,
  updateProfile,
  type ProfileDto,
  type UpdateProfilePayload,
} from '@/shared/api/axios-instance';

/**
 * DT_0005: редактор профиля поверх экрана — по макету «Профиль» кнопка
 * «редактировать профиль» открывает форму, а не отдельную страницу.
 *
 * Проверки повторяют шлюз, чтобы не гонять заведомо неверный запрос:
 * username 1…255 из латиницы, цифр и «_», name ≤ 255, birth_date не позже
 * сегодняшней, avatar_url ≤ 255. Контракт profile.v1 не умеет очищать поле:
 * пустое значение просто не отправляем.
 */

/** Дата в UTC, как её сравнивает шлюз: локальная зона могла бы уехать на день. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .max(255, 'не больше 255 символов')
    .refine(
      (value) => value === '' || /^[a-zA-Z0-9_]+$/.test(value),
      'только латиница, цифры и «_»',
    ),
  name: z.string().trim().max(255, 'не больше 255 символов'),
  birth_date: z
    .string()
    .refine(
      (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
      'дата в формате ГГГГ-ММ-ДД',
    )
    .refine(
      (value) => value === '' || value <= todayIso(),
      'дата не может быть позже сегодняшней',
    ),
  avatar_url: z.string().trim().max(255, 'не больше 255 символов'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileEditSheet({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile.username ?? '',
      name: profile.name ?? '',
      birth_date: profile.birth_date ?? '',
      avatar_url: profile.avatar_url ?? '',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const save = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      onSaved();
    },
  });

  // Esc закрывает шит: форма — оверлей, а не страница.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = handleSubmit((values) => {
    setNotice(null);

    const payload: UpdateProfilePayload = {};
    if (values.username !== '' && values.username !== (profile.username ?? '')) {
      payload.username = values.username;
    }
    if (values.name !== '' && values.name !== (profile.name ?? '')) {
      payload.name = values.name;
    }
    if (
      values.birth_date !== '' &&
      values.birth_date !== (profile.birth_date ?? '')
    ) {
      payload.birth_date = values.birth_date;
    }
    if (
      values.avatar_url !== '' &&
      values.avatar_url !== (profile.avatar_url ?? '')
    ) {
      payload.avatar_url = values.avatar_url;
    }

    if (Object.keys(payload).length === 0) {
      setNotice('нечего сохранять — поля не изменились');
      return;
    }

    save.mutate(payload);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(6,6,3,0.72)] p-0 backdrop-blur-[6px] dt:items-center dt:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        className="sheet-rise max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border border-line bg-raised p-5 shadow-pop dt:rounded-xl dt:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <h2
            id="profile-edit-title"
            className="min-w-0 flex-1 font-display text-[18px] leading-[1.15] font-extrabold tracking-[-0.03em] text-ink dt:text-[20px]"
          >
            редактировать профиль
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="закрыть"
            className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-hover text-ink transition-colors duration-150 hover:bg-hover-strong"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <Field
            label="логин"
            hint="латиница, цифры и «_», 1–255 символов"
            error={errors.username?.message}
          >
            <input
              {...register('username')}
              autoComplete="username"
              autoFocus
              placeholder="nona"
              className={inputClass(errors.username?.message !== undefined)}
            />
          </Field>

          <Field
            label="имя"
            hint="как подписывать игры, до 255 символов"
            error={errors.name?.message}
          >
            <input
              {...register('name')}
              autoComplete="name"
              placeholder="нона"
              className={inputClass(errors.name?.message !== undefined)}
            />
          </Field>

          <Field label="дата рождения" error={errors.birth_date?.message}>
            <input
              {...register('birth_date')}
              type="date"
              max={todayIso()}
              className={inputClass(errors.birth_date?.message !== undefined)}
            />
          </Field>

          <Field
            label="аватар"
            hint="ссылка на картинку, до 255 символов"
            error={errors.avatar_url?.message}
          >
            <input
              {...register('avatar_url')}
              inputMode="url"
              placeholder="http://localhost:9000/hookster/avatars/user.png"
              className={inputClass(errors.avatar_url?.message !== undefined)}
            />
          </Field>

          {notice && (
            <p className="rounded-md border border-line bg-hover px-3 py-2.5 text-[13px] font-semibold text-ink-soft">
              {notice}
            </p>
          )}

          {save.isError && (
            <p className="rounded-md border border-hot/40 bg-[rgba(255,46,147,0.12)] px-3 py-2.5 text-[13px] font-semibold text-hot-200">
              {errorMessage(save.error)}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-[0_1_auto] rounded-pill border-2 border-line-strong px-5 text-[15px] font-bold text-ink transition-colors duration-150 hover:border-acid hover:text-acid"
            >
              отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || save.isPending}
              className="h-12 flex-[1_1_auto] rounded-pill bg-acid px-6 text-[15px] font-extrabold text-peel-900 transition-[background,transform] duration-150 hover:-translate-y-0.5 hover:bg-acid-hi active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
            >
              {save.isPending ? 'сохраняем…' : 'сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return [
    'h-12 w-full rounded-md border bg-peel-700 px-3.5 text-[15px] text-ink placeholder:text-ink-mute',
    'transition-colors duration-150 outline-none focus:border-acid',
    invalid ? 'border-hot' : 'border-line',
  ].join(' ');
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-ink-mute uppercase">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-[12px] font-semibold text-hot-200">{error}</span>
      ) : (
        hint && <span className="text-[12px] text-ink-mute">{hint}</span>
      )}
    </label>
  );
}

/** Тост после сохранения: на экране профиля, без перезагрузки. */
export function ProfileSavedToast({ message }: { message: string }) {
  return (
    <div
      className="toast-drop fixed top-[78px] left-1/2 z-[60] flex items-center gap-2 rounded-pill bg-peel-25 px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-peel-900 shadow-pop"
      style={{ transform: 'translateX(-50%)' }}
    >
      <CheckIcon className="h-4 w-4 text-lime-600" />
      {message}
    </div>
  );
}
