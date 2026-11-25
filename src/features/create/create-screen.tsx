'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseIcon, WandIcon } from '@/components/ui/icons';
import { GamePicker } from '@/features/create/game-picker';
import { RemixForm } from '@/features/create/remix-form';
import { RemixReady } from '@/features/create/remix-ready';
import { GeneratingPanel, RemixFailedCard } from '@/features/create/remix-status';
import { SourcePanel } from '@/features/create/source-panel';
import { generateErrorText, taskErrorText } from '@/features/create/remix-errors';
import { createTask, getTask } from '@/shared/api/axios-instance';
import { getGameCached } from '@/shared/lib/game-cache';

/**
 * Экран AI Remix по макету 06: карточка 1060 px, слева исходная игра,
 * справа промпт и запуск. Пока задача жива — «Generating your game»,
 * после SUCCESS — Remix Ready (07), после ERROR — карточка из 08.
 *
 * Чего нет в API, того нет и на экране: процентов генерации, длительности
 * сессии, списка слоёв механики и веса файла шлюз не отдаёт. Показываем
 * реальные вещи — состояние задачи, время с запуска и свой промпт.
 */

interface RemixRequest {
  gameId: string;
  prompt: string;
  startedAt: number;
}

export function CreateScreen({ initialGameId }: { initialGameId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [gameId, setGameId] = useState(initialGameId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [request, setRequest] = useState<RemixRequest | null>(null);

  // Переход «ещё ремикс» ведёт на /create?gameId={новая игра}: компонент
  // остаётся тем же, поэтому состояние сбрасываем руками и начинаем с формы.
  useEffect(() => {
    if (!initialGameId) return;
    setGameId(initialGameId);
    setTaskId(null);
    setRequest(null);
  }, [initialGameId]);

  /* ---------- исходная игра ---------- */

  const sourceGame = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGameCached(gameId),
    enabled: gameId !== '',
    retry: false,
    staleTime: 30_000,
  });

  const pickGame = useCallback(
    (nextId: string) => {
      if (!nextId) return;
      setGameId(nextId);
      setTaskId(null);
      setRequest(null);
      setPickerOpen(false);
      // Адрес повторяет выбор: ссылкой на ремикс можно поделиться, а
      // перезагрузка не потеряет исходную игру.
      router.replace(`/create?gameId=${encodeURIComponent(nextId)}`);
    },
    [router],
  );

  /* ---------- запуск генерации ---------- */

  const generate = useMutation({
    mutationFn: (input: { gameId: string; prompt: string }) =>
      createTask({
        gameId: input.gameId,
        prompt: input.prompt,
        idempotencyKey: newIdempotencyKey(),
      }),
  });

  const start = useCallback(
    (nextGameId: string, prompt: string) => {
      setTaskId(null);
      setRequest({ gameId: nextGameId, prompt, startedAt: Date.now() });
      generate.mutate({ gameId: nextGameId, prompt });
    },
    [generate],
  );

  /* ---------- состояние задачи ---------- */

  const task = useQuery({
    queryKey: ['remix-task', taskId],
    queryFn: () => getTask(taskId as string),
    enabled: taskId !== null,
    retry: false,
    // CL_0004: шлюз просит не чаще раза в 2 секунды.
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === 'SUCCESS' || state === 'ERROR' ? false : 2000;
    },
  });

  const taskState = task.data?.state;
  const finishedGameId =
    taskId && taskState === 'SUCCESS' ? task.data?.gameId : undefined;

  // Новая игра уже в ленте и в «моих играх» — обновляем их один раз.
  const invalidatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!finishedGameId) return;
    if (invalidatedRef.current === finishedGameId) return;
    invalidatedRef.current = finishedGameId;
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    void queryClient.invalidateQueries({ queryKey: ['my-games'] });
  }, [finishedGameId, queryClient]);

  const backToForm = useCallback(() => setTaskId(null), []);

  const retry = useCallback(() => {
    if (!request) {
      setTaskId(null);
      return;
    }
    start(request.gameId, request.prompt);
  }, [request, start]);

  /* ---------- экран результата ---------- */

  if (finishedGameId) {
    return (
      <RemixReady
        gameId={finishedGameId}
        sourceGameId={request?.gameId ?? ''}
        prompt={request?.prompt ?? ''}
        startedAt={request?.startedAt ?? null}
      />
    );
  }

  if (taskId && taskState === 'ERROR') {
    return (
      <RemixFailedCard
        icon="alert"
        title="не получилось"
        message={taskErrorText(task.data?.errorCode, task.data?.errorMessage)}
        primaryLabel="попробовать снова"
        onPrimary={retry}
        secondaryLabel="изменить промпт"
        onSecondary={backToForm}
      />
    );
  }

  if (taskId && task.isError) {
    return (
      <RemixFailedCard
        icon="offline"
        title="связь пропала"
        message="не удалось узнать состояние генерации. Задача могла продолжиться на сервере — сначала проверь ещё раз, и только потом запускай новую."
        primaryLabel="проверить снова"
        onPrimary={() => void task.refetch()}
        secondaryLabel="к форме"
        onSecondary={backToForm}
      />
    );
  }

  /* ---------- форма ---------- */

  const generating = taskId !== null;

  return (
    <div className="min-h-dvh bg-stage">
      <div className="flex min-h-dvh w-full items-start justify-center px-4 py-5 pb-24 dt:items-center dt:px-6 dt:py-10">
        <div className="remix-card grid w-full max-w-[1060px] overflow-hidden rounded-xl border-2 border-acid bg-page dt:min-h-[560px] dt:grid-cols-[328px_1fr]">
          <SourcePanel
            game={sourceGame.data}
            pending={gameId !== '' && sourceGame.isPending}
            failed={sourceGame.isError}
            locked={generating}
            onPick={() => setPickerOpen(true)}
          />

          <div className="flex min-w-0 flex-col gap-5 p-4 dt:p-7">
            <header className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-pill bg-acid text-peel-900">
                <WandIcon className="h-[22px] w-[22px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="m-0 font-display text-[22px] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink dt:text-[24px]">
                  сделать ремикс
                </h1>
                <p className="mt-1.5 mb-0 text-[13px] leading-[1.5] font-medium text-ink-soft dt:text-[14px]">
                  генерация идёт поверх исходной игры: механика остаётся, ассеты
                  и правила собираются заново.
                </p>
              </div>
              <Link
                href="/feed"
                aria-label="закрыть и вернуться в ленту"
                className="grid h-9 w-9 flex-none place-items-center rounded-pill bg-hover text-ink transition-[background,transform] duration-150 hover:bg-hover-strong active:scale-[0.94]"
              >
                <CloseIcon className="h-[18px] w-[18px]" />
              </Link>
            </header>

            {generating ? (
              <GeneratingPanel
                state={taskState}
                prompt={request?.prompt ?? ''}
                startedAt={request?.startedAt ?? Date.now()}
              />
            ) : (
              <RemixForm
                key={`${gameId}:${request?.prompt ?? ''}`}
                game={sourceGame.data}
                initialPrompt={request?.prompt ?? ''}
                pending={generate.isPending}
                errorText={generate.isError ? generateErrorText(generate.error) : null}
                traceError={generate.error}
                onPick={() => setPickerOpen(true)}
                onStart={(prompt) => start(gameId, prompt)}
              />
            )}
          </div>
        </div>
      </div>

      {pickerOpen && (
        <GamePicker
          selectedId={gameId}
          onSelect={(game) => pickGame(game.gameId)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/** Ключ идемпотентности: тот же повтор не создаёт вторую задачу. */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ui-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
