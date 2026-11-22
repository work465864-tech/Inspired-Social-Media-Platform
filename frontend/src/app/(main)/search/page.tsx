import { SearchPage } from '../../../features/search/components/SearchPage';
import type { SearchTab } from '../../../features/search/types';

type SearchRouteProps = {
  searchParams: Promise<{
    q?: string | string[];
    tab?: string | string[];
  }>;
};

export default async function SearchRoute({ searchParams }: SearchRouteProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab: SearchTab =
    requestedTab === 'people' ||
    requestedTab === 'videos' ||
    requestedTab === 'hashtags' ||
    requestedTab === 'top'
      ? requestedTab
      : 'top';

  return <SearchPage initialQuery={query ?? ''} initialTab={initialTab} />;
}
