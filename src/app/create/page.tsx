import type { Metadata } from 'next';
import { CreateScreen } from '@/features/create/create-screen';
import { RequireAuth } from '@/shared/lib/require-auth';

export const metadata: Metadata = {
  title: 'AI Remix — hookster',
};

/**
 * AI Remix по макету 06. `?gameId=` — исходная игра: сюда ведёт кнопка
 * «ремикс» в ленте и «ещё ремикс» на экране результата.
 */
export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  return (
    <RequireAuth>
      <CreateScreen initialGameId={raw ?? ''} />
    </RequireAuth>
  );
}
