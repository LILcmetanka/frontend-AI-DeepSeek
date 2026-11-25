'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import {
  addLike,
  getLikedGameIds,
  removeLike,
} from '@/shared/api/axios-instance';
import { useSignedIn } from '@/shared/lib/use-signed-in';

/**
 * Лайки игры — одно место на ленту и на экран игры.
 *
 * Шлюз отдаёт только id понравившихся (`GET /likes`) и 204 на POST/DELETE,
 * поэтому состояние сердца берём из списка id, а число лайков нигде не
 * рисуем: счётчика в API нет. Гостя отправляем на вход и возвращаем туда,
 * откуда он пришёл (`next`).
 */
export function useGameLikes(nextPath: string = '/feed') {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signedIn = useSignedIn();

  const likesQuery = useQuery({
    queryKey: ['likes'],
    queryFn: () => getLikedGameIds(100),
    enabled: signedIn,
    retry: false,
    staleTime: 60_000,
  });

  const likedIds = useMemo(
    () => new Set(likesQuery.data ?? []),
    [likesQuery.data],
  );

  const likeMutation = useMutation({
    mutationFn: async ({
      gameId,
      next,
    }: {
      gameId: string;
      next: boolean;
    }): Promise<void> => {
      if (next) {
        await addLike(gameId);
        return;
      }
      await removeLike(gameId);
    },
    onMutate: async ({ gameId, next }) => {
      await queryClient.cancelQueries({ queryKey: ['likes'] });
      const previous = queryClient.getQueryData<string[]>(['likes']) ?? [];
      queryClient.setQueryData<string[]>(
        ['likes'],
        next
          ? Array.from(new Set([...previous, gameId]))
          : previous.filter((id) => id !== gameId),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context) queryClient.setQueryData(['likes'], context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
    },
  });

  const toggleLike = useCallback(
    (gameId: string) => {
      if (!signedIn) {
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      likeMutation.mutate({ gameId, next: !likedIds.has(gameId) });
    },
    [likeMutation, likedIds, nextPath, router, signedIn],
  );

  return { likedIds, signedIn, toggleLike };
}
