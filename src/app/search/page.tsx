import type { Metadata } from 'next';
import { SearchScreen } from '@/features/search/search-screen';

export const metadata: Metadata = {
  title: 'поиск — hookster',
};

/** Поиск и каталог по макету 04. */
export default function SearchPage() {
  return <SearchScreen />;
}
