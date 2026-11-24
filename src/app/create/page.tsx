"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  createTask,
  errorMessage,
  getGame,
  getTask,
  sendEvent,
  taskErrorMessage,
  taskStateLabel,
  type GameDto,
} from "@/shared/api/axios-instance";
import { GamePlayer, type PlayerEvent } from "@/shared/lib/game-player";
import { RequireAuth } from "@/shared/lib/require-auth";

/**
 * AI Studio: сообщение «сделай игру быстрее» → задача → статус → итог.
 * Статус опрашивается, пока задача не завершится: шлюз отдаёт его
 * по GET /generate/{taskId} (orchestrator.CheckGameState).
 */
// Адрес сборки игры — build-arg, как на странице ленты.
const GAME_URL = (process.env.NEXT_PUBLIC_GAME_URL ?? '').trim();
const SPRITE_BASE_URL = (process.env.NEXT_PUBLIC_SPRITE_BASE_URL ?? '').trim();

export default function CreatePage() {
  return (
    <RequireAuth>
      <CreateContent />
    </RequireAuth>
  );
}

// IN_0001: клиент не отправляет сообщение вне алфавита M. Сервер проверяет
// то же самое, но лишний круг до модели и ошибка 400 пользователю не нужны.
const PROMPT_ALPHABET =
  /^[\p{Script=Cyrillic}\p{Script=Latin}0-9.,:;!?\-–—()«»"'%+=/№ \t\n\r]*$/u;

function promptProblem(value: string): string | null {
  const trimmed = value.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
  if (trimmed.length === 0) return "Сообщение не может быть пустым";
  if (trimmed.length > 1500) return "Не больше 1500 символов";
  if (!PROMPT_ALPHABET.test(trimmed)) {
    return "Только русские и латинские буквы, цифры и знаки . , : ; ! ? - – — ( ) « » \" ' % + = / №";
  }
  return null;
}

function CreateContent() {
  const queryClient = useQueryClient();
  const [gameId, setGameId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createTask({
        gameId: gameId.trim(),
        prompt: prompt.trim(),
        idempotencyKey: `ui-${Date.now()}`,
      }),
    onSuccess: (data) => {
      setTaskId(data.taskId);
      // Лента и «мои игры» устарели: появилась новая игра.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['my-games'] });
    },
  });

  const task = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId as string),
    enabled: taskId !== null,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === "SUCCESS" || state === "ERROR" ? false : 2000;
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold sm:text-2xl">AI Studio</h1>
      <p className="max-w-2xl text-sm text-zinc-400">
        Опишите, что поменять в игре. ИИ меняет только конфиг и ассеты, механика
        шаблона остаётся прежней.
      </p>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const problem = promptProblem(prompt);
          if (problem) {
            setPromptError(problem);
            return;
          }
          setPromptError(null);
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
            onChange={(event) => {
              setPrompt(event.target.value);
              if (promptError) setPromptError(null);
            }}
            className="w-full max-w-lg rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
          {promptError && <span className="text-red-300">{promptError}</span>}
        </label>

        <button
          disabled={create.isPending}
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-zinc-950 disabled:opacity-50"
        >
          {create.isPending ? "Отправляем…" : "Сгенерировать"}
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
            Состояние:{" "}
            <span className="font-medium">
              {taskStateLabel(task.data?.state)}
            </span>
          </p>
          {task.data?.state === "ERROR" && (
            <p className="text-red-300">
              {taskErrorMessage(task.data.errorCode, task.data.errorMessage)}
            </p>
          )}
          {task.data?.gameId && (
            <p>
              Игра:{" "}
              <Link
                className="text-emerald-400"
                href={`/feed/${task.data.gameId}`}
              >
                {task.data.gameId}
              </Link>
            </p>
          )}
          {task.data?.result && (
            <pre className="max-h-72 overflow-auto rounded bg-zinc-900 p-3 text-xs text-emerald-200">
              {pretty(task.data.result)}
            </pre>
          )}
        </div>
      )}

      {/* CL_0004: после завершения загружаем изменённую мини-игру — прямо
          здесь, без перехода: сразу видно, что получилось. */}
      {task.data?.state === 'SUCCESS' && task.data.gameId && (
        <ResultGame gameId={task.data.gameId} />
      )}
    </section>
  );
}

/** Изменённая игра после SUCCESS: карточка + плеер. */
function ResultGame({ gameId }: { gameId: string }) {
  const game = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGame(gameId),
    retry: false,
    staleTime: 30_000,
  });

  const data: GameDto | undefined = game.data;

  if (game.isLoading) {
    return <p className="text-sm text-zinc-400">Загружаем изменённую игру…</p>;
  }
  if (game.isError || !data) {
    return (
      <p className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
        Игра сохранена, но открыть её сейчас не удалось: {errorMessage(game.error)}
      </p>
    );
  }

  const handleEvent = (event: PlayerEvent) => {
    void sendEvent({
      userId: data.authorId,
      gameId: data.gameId,
      type: event.type,
      durationSec: event.durationSec,
    }).catch((error: unknown) => {
      console.warn('Не удалось отправить событие игры:', error);
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Новая игра</h2>
      <p className="text-sm text-zinc-400">{data.title}</p>
      {GAME_URL ? (
        <GamePlayer
          gameId={data.gameId}
          userId={data.authorId}
          config={data.config}
          gameUrl={GAME_URL}
          spriteBaseUrl={SPRITE_BASE_URL}
          engineMinVersion={data.engineMinVersion}
          onEvent={handleEvent}
          onReady={(readyMs) => {
            console.info(`[NF_0001] игра готова за ${readyMs} мс`);
          }}
        />
      ) : (
        <Link className="text-emerald-400" href={`/feed/${data.gameId}`}>
          Открыть игру в ленте
        </Link>
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
