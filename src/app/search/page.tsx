import type { Metadata } from 'next';
import { SearchScreen } from '@/features/search/search-screen';

export const metadata: Metadata = {
  title: 'Поиск — Hookster',
};

/** Поиск и каталог по макету 04. */
export default function SearchPage() {
  return <SearchScreen />;
}
