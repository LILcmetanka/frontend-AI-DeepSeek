'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { WandIcon } from '@/components/ui/icons';
import { TraceIdNote } from '@/components/ui/trace-id-note';
import { buttonClass } from '@/components/ui/controls';
import type { GameDto } from '@/shared/api/axios-instance';

/**
 * Поле промпта из макета 06: многострочное, моноширинное, с «>» и счётчиком,
 * под ним — чипсы-подсказки. Запуск — одна кнопка «ремикс» внутри поля,
 * как в специмене prompt-field: одна лаймовая primary на экран.
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
  traceError,
  onPick,
  onStart,
}: {
  game: GameDto | undefined;
  initialPrompt: string;
  pending: boolean;
  errorText: string | null;
  /** Сама ошибка запроса: из неё берём код запроса (Э27). */
  traceError?: unknown;
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
          className="font-mono text-micro font-bold tracking-caps text-accent uppercase"
        >
          что поменять
        </label>

        <div
          className={`relative rounded-lg border-2 bg-input transition-shadow duration-[var(--dur-fast)] focus-within:shadow-glow-strong ${
            error ? 'border-danger' : 'border-lime-300'
          }`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute top-3.5 left-4 font-mono text-body-sm leading-body text-accent"
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
            className="min-h-[96px] w-full resize-y rounded-[10px] bg-transparent py-3.5 pr-4 pb-12 pl-9 font-mono text-body-sm leading-body text-ink outline-none placeholder:text-ink-mute"
          />
          {/* Кнопка «ремикс» внутри поля — как в специмене prompt-field. */}
          <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-3">
            <span className="font-mono text-micro text-ink-mute tabular-nums">
              {prompt?.length ?? 0} / {PROMPT_MAX}
            </span>
            <button
              type="submit"
              disabled={!canStart}
              className={`pointer-events-auto ${buttonClass('primary', 'sm', 'gap-1.5')}`}
            >
              <WandIcon className="h-[15px] w-[15px]" />
              {pending ? 'запускаем…' : 'ремикс'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => addChip(chip)}
              className="rounded-pill bg-hover px-[11px] py-[7px] font-mono text-micro text-ink-soft transition-[background,color,transform] duration-[var(--dur-fast)] hover:bg-acid/20 hover:text-ink active:scale-[0.94]"
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
            <span className="text-caption font-semibold text-danger">{error}</span>
          ) : game ? (
            <span className="line-clamp-2 text-caption leading-body text-ink-soft">
              механика {game.title ? `«${game.title}»` : 'шаблона'} останется,
              ассеты и правила соберутся заново
            </span>
          ) : (
            <button
              type="button"
              onClick={onPick}
              className="text-caption font-semibold text-accent underline-offset-2 transition-colors hover:underline"
            >
              сначала выбери исходную игру
            </button>
          )}
          <span className="flex-none font-mono text-micro text-ink-mute tabular-nums">
            {prompt?.length ?? 0} / {PROMPT_MAX}
          </span>
        </div>
      </div>

      {errorText && (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-3 text-caption leading-body font-semibold text-danger"
        >
          {errorText}
        </p>
      )}

      {/* Код запроса из ответа шлюза: по нему ищут инцидент (Э27). */}
      <TraceIdNote error={traceError} />

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <Link
            href="/feed"
            className="inline-flex h-[42px] flex-none items-center justify-center rounded-pill border-2 border-line-strong px-[18px] text-body-sm font-bold text-ink transition-[border-color,color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:border-accent-line hover:text-accent active:scale-[0.94]"
          >
            отмена
          </Link>
          <p className="font-mono text-micro text-ink-mute">
            3 генерации в сутки · лимит считается по календарным суткам
          </p>
        </div>
      </div>
    </form>
  );
}
