'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { createTask, errorMessage, getTask } from '@/shared/api/axios-instance';

/**
 * AI Studio: сообщение «сделай игру быстрее» → задача → статус → итог.
 * Статус опрашивается, пока задача не завершится: шлюз отдаёт его
 * по GET /generate/{taskId} (orchestrator.CheckGameState).
 */
export default function CreatePage() {
  const [gameId, setGameId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createTask({
        gameId: gameId.trim(),
        prompt: prompt.trim(),
        idempotencyKey: `ui-${Date.now()}`,
      }),
    onSuccess: (data) => setTaskId(data.taskId),
  });

  const task = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTask(taskId as string),
    enabled: taskId !== null,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === 'SUCCESS' || state === 'ERROR' ? false : 2000;
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">AI Studio</h1>
      <p className="max-w-2xl text-sm text-zinc-400">
        Опишите, что поменять в игре. ИИ меняет только конфиг и ассеты,
        механика шаблона остаётся прежней.
      </p>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Игра (UUID из ленты)</span>
          <input
            required
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
            className="w-full max-w-lg rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Что поменять (1–1500 символов)</span>
          <textarea
            required
            maxLength={1500}
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="w-full max-w-lg rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </label>

        <button
          disabled={create.isPending}
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950 disabled:opacity-50"
        >
          {create.isPending ? 'Отправляем…' : 'Сгенерировать'}
        </button>
      </form>

      {create.isError && (
        <p className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          {errorMessage(create.error)}
        </p>
      )}

      {taskId && (
        <div className="space-y-2 rounded border border-zinc-800 p-4 text-sm">
          <p>
            Задача <code className="text-emerald-400">{taskId}</code>
          </p>
          <p>
            Состояние:{' '}
            <span className="font-medium">{task.data?.state ?? '…'}</span>
          </p>
          {task.data?.errorMessage && (
            <p className="text-red-300">{task.data.errorMessage}</p>
          )}
          {task.data?.gameId && (
            <p>
              Игра:{' '}
              <a
                className="text-emerald-400"
                href={`/feed/${task.data.gameId}`}
              >
                {task.data.gameId}
              </a>
            </p>
          )}
          {task.data?.result && (
            <pre className="max-h-72 overflow-auto rounded bg-zinc-900 p-3 text-xs text-emerald-200">
              {pretty(task.data.result)}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
