import type { Metadata } from 'next';
import { SessionResultScreen } from '@/features/game/session-result-screen';

export const metadata: Metadata = {
  title: 'итог сессии — hookster',
};

/**
 * Экран итога сессии по макету 03. Сюда ведёт «назад» с экрана игры;
 * данные — из `sessionStorage` (что записал экран игры).
 */
export default async function SessionResultPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <SessionResultScreen gameId={gameId} />;
}
