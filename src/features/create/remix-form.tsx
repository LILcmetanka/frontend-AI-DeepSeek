'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { WandIcon } from '@/components/ui/icons';
import type { GameDto } from '@/shared/api/axios-instance';

/**
 * Поле промпта из макета 06: многострочное, моноширинное, с «>» и счётчиком,
 * под ним — чипсы-подсказки. Запуск — одна кнопка «собрать ремикс».
 *
 * IN_0001: 1…1500 символов из алфавита, который принимает оркестратор
 * (кириллица, латиница, цифры, обычные знаки). Проверяем на клиенте те же
 * правила, чтобы не гонять заведомо неверный запрос до модели.
 */

const PROMPT_ALPHABET =
  /^[\p{Script=Cyrillic}\p{Script=Latin}0-9.,:;!?\-–—()«»"'%+=/№ \t\n\r]*$/u;

export const PROMPT_MAX = 1500;

const remixSchema = z.object({
  prompt: z
    .string()
    .refine((value) => value.trim().length > 0, {
      message: 'промпт не может быть пустым',
    })
    .refine((value) => value.trim().length <= PROMPT_MAX, {
      message: `не больше ${PROMPT_MAX} символов`,
    })
    .refine((value) => PROMPT_ALPHABET.test(value.trim()), {
      message:
        'только русские и латинские буквы, цифры и знаки . , : ; ! ? - – — ( ) « » " \' % + = / №',
    }),
});

type RemixValues = z.infer<typeof remixSchema>;

/** Подсказки из макета. Без «×»: этого символа нет в алфавите IN_0001. */
const CHIPS = [
  'двойной выстрел',
  'пусть это будет про котов',
  'ночной режим',
  'в два раза быстрее',
];

export function RemixForm({
  game,
  initialPrompt,
  pending,
  errorText,
  onPick,
  onStart,
}: {
  game: GameDto | undefined;
  initialPrompt: string;
  pending: boolean;
  errorText: string | null;
  onPick: () => void;
  onStart: (prompt: string) => void;
}) {
  const form = useForm<RemixValues>({
    resolver: zodResolver(remixSchema),
    defaultValues: { prompt: initialPrompt },
    mode: 'onSubmit',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = form;

  const prompt = watch('prompt');
  const error = errors.prompt?.message;

  function addChip(chip: string): void {
    const trimmed = (prompt ?? '').replace(/\s+$/, '');
    const next = trimmed ? `${trimmed} ${chip}` : chip;
    setValue('prompt', next.slice(0, PROMPT_MAX), {
      shouldValidate: false,
      shouldDirty: true,
    });
    clearErrors('prompt');
  }

  const submit = handleSubmit((values) => {
    if (!game) return;
    onStart(values.prompt.trim());
  });

  const canStart = Boolean(game) && !pending;

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="remix-prompt"
          className="font-mono text-[11px] font-bold tracking-[0.14em] text-acid uppercase"
        >
          что поменять
        </label>

        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-3.5 left-4 font-mono text-[14px] leading-[1.5] text-acid"
          >
            &gt;
          </span>
          <textarea
            {...register('prompt')}
            id="remix-prompt"
            rows={3}
            maxLength={PROMPT_MAX}
            placeholder="босс в два раза больше, пули как бананы, фон — ночная кухня"
            aria-invalid={error !== undefined}
            aria-describedby="remix-prompt-help"
            className={`min-h-[96px] w-full resize-y rounded-md border bg-peel-700 py-3.5 pr-3.5 pl-9 font-mono text-[14px] leading-[1.5] text-ink transition-colors duration-150 outline-none placeholder:text-ink-mute focus:border-acid ${
              error ? 'border-hot' : 'border-line'
            }`}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => addChip(chip)}
              className="rounded-pill bg-hover px-[11px] py-[7px] font-mono text-[11px] text-ink-soft transition-[background,color,transform] duration-150 hover:bg-[rgba(198,255,46,0.22)] hover:text-ink active:scale-[0.94]"
            >
              {chip}
            </button>
          ))}
        </div>

        <div
          id="remix-prompt-help"
          className="flex items-start justify-between gap-3"
        >
          {error ? (
            <span className="text-[12px] font-semibold text-hot-200">{error}</span>
          ) : game ? (
            <span className="line-clamp-2 text-[12px] leading-[1.45] text-ink-soft">
              механика {game.title ? `«${game.title}»` : 'шаблона'} останется,
              ассеты и правила соберутся заново
            </span>
          ) : (
            <button
              type="button"
              onClick={onPick}
              className="text-[12px] font-semibold text-acid underline-offset-2 transition-colors hover:underline"
            >
              сначала выбери исходную игру
            </button>
          )}
          <span className="flex-none font-mono text-[11px] text-ink-mute tabular-nums">
            {prompt?.length ?? 0} / {PROMPT_MAX}
          </span>
        </div>
      </div>

      {errorText && (
        <p
          role="alert"
          className="rounded-md border border-hot/40 bg-[rgba(255,46,147,0.12)] px-3.5 py-3 text-[13px] leading-[1.5] font-semibold text-hot-200"
        >
          {errorText}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2.5 dt:flex-row dt:items-center">
          <button
            type="submit"
            disabled={!canStart}
            className="inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-pill bg-acid text-[16px] font-extrabold whitespace-nowrap text-peel-900 transition-[background,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-acid-hi hover:shadow-[0_0_24px_rgba(198,255,46,0.45)] active:scale-[0.94] disabled:pointer-events-none disabled:opacity-50 dt:flex-1"
          >
            <WandIcon className="h-5 w-5" />
            {pending ? 'запускаем…' : 'собрать ремикс'}
          </button>
          <Link
            href="/feed"
            className="inline-flex h-[54px] flex-none items-center justify-center rounded-pill border-2 border-line-strong px-[20px] text-[15px] font-bold text-ink transition-[border-color,color,transform] duration-150 hover:-translate-y-0.5 hover:border-acid hover:text-acid active:scale-[0.94]"
          >
            отмена
          </Link>
        </div>

        <p className="font-mono text-[11px] text-ink-mute">
          3 генерации в сутки · лимит считается по календарным суткам
        </p>
      </div>
    </form>
  );
}
