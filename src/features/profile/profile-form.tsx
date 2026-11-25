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
import { Button, Field, Input, Message, buttonClass } from '@/components/ui/controls';

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 backdrop-blur-[6px] dt:items-center dt:p-6"
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
            className="min-w-0 flex-1 font-display text-title-3 leading-title font-extrabold tracking-display text-ink dt:text-title-2"
          >
            редактировать профиль
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="закрыть"
            className="grid h-10 w-10 flex-none place-items-center rounded-md bg-hover text-ink transition-[background,transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-hover-strong focus-visible:shadow-glow-strong focus-visible:outline-none active:scale-[0.94]"
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
            <Input
              invalid={errors.username?.message !== undefined}
              {...register('username')}
              autoComplete="username"
              autoFocus
              placeholder="nona"
            />
          </Field>

          <Field
            label="имя"
            hint="как подписывать игры, до 255 символов"
            error={errors.name?.message}
          >
            <Input
              invalid={errors.name?.message !== undefined}
              {...register('name')}
              autoComplete="name"
              placeholder="нона"
            />
          </Field>

          <Field label="дата рождения" error={errors.birth_date?.message}>
            <Input
              invalid={errors.birth_date?.message !== undefined}
              {...register('birth_date')}
              type="date"
              max={todayIso()}
            />
          </Field>

          <Field
            label="аватар"
            hint="ссылка на картинку, до 255 символов"
            error={errors.avatar_url?.message}
          >
            <Input
              invalid={errors.avatar_url?.message !== undefined}
              {...register('avatar_url')}
              inputMode="url"
              placeholder="http://localhost:9000/hookster/avatars/user.png"
            />
          </Field>

          {notice && (
            <p className="rounded-md border border-line bg-hover px-3 py-2.5 text-caption font-semibold text-ink-soft">
              {notice}
            </p>
          )}

          {save.isError && <Message tone="error">{errorMessage(save.error)}</Message>}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>
              отмена
            </Button>
            <button
              type="submit"
              disabled={isSubmitting || save.isPending}
              className={buttonClass('primary', 'lg', 'flex-[1_1_auto]')}
            >
              {save.isPending ? 'сохраняем…' : 'сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Тост после сохранения: на экране профиля, без перезагрузки. */
export function ProfileSavedToast({ message }: { message: string }) {
  return (
    <div
      className="toast-drop fixed top-[78px] left-1/2 z-[60] flex items-center gap-2 rounded-pill bg-inverse px-4 py-2.5 text-caption font-bold whitespace-nowrap text-on-inverse shadow-pop"
      style={{ transform: 'translateX(-50%)' }}
    >
      <CheckIcon className="h-4 w-4 text-lime-600" />
      {message}
    </div>
  );
}
