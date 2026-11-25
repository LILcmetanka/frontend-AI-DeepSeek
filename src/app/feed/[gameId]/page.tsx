import type { Metadata } from 'next';
import { PlayingScreen } from '@/features/game/playing-screen';

export const metadata: Metadata = {
  title: 'игра — hookster',
};

/**
 * Экран игры по макету 02 «Playing». Работу делает клиентский компонент:
 * конфиг берётся из `GET /feed/{gameId}` (сначала локальная копия).
 */
export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <PlayingScreen gameId={gameId} />;
}
