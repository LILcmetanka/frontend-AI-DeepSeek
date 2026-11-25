import type { Metadata } from 'next';
import { FeedScreen } from '@/features/feed/feed-screen';

export const metadata: Metadata = {
  title: 'Лента — Hookster',
};

/** Главный экран: полноэкранная лента игр (CL_0001, макет «Главная · лента»). */
export default function FeedPage() {
  return <FeedScreen />;
}
