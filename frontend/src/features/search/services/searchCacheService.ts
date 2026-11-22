import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { searchPageSize } from '../constants';
import type {
  SearchFilters,
  SearchPage,
  SearchPageCursor,
  SearchResult,
  SearchTarget,
} from '../types';
import { SearchError } from './searchUtils';
import { searchQueryKeys } from '../constants/queryKeys';
import { searchService } from './searchService';

export class SearchCacheService {
  resultKey(
    userId: string | null,
    query: string,
    target: SearchTarget,
    filters: SearchFilters,
  ) {
    return searchQueryKeys.results(userId, query, target, filters);
  }

  topKey(userId: string | null, query: string) {
    return searchQueryKeys.top(userId, query);
  }

  suggestionKey(userId: string | null, query: string) {
    return searchQueryKeys.suggestions(userId, query);
  }

  historyKey(userId: string | null) {
    return searchQueryKeys.history(userId);
  }

  trendingKey(userId: string | null) {
    return searchQueryKeys.trending(userId);
  }

  async prefetchTop(
    queryClient: QueryClient,
    userId: string,
    query: string,
  ): Promise<void> {
    await queryClient.prefetchQuery<SearchResult[]>({
      queryKey: this.topKey(userId, query),
      queryFn: ({ signal }) => searchService.searchTop(query, signal),
      staleTime: 30_000,
    });
  }

  async prefetchResults(
    queryClient: QueryClient,
    userId: string,
    query: string,
    target: SearchTarget,
    filters: SearchFilters,
  ): Promise<void> {
    await queryClient.prefetchInfiniteQuery<
      SearchPage,
      SearchError,
      InfiniteData<SearchPage, SearchPageCursor | null>,
      ReturnType<SearchCacheService['resultKey']>,
      SearchPageCursor | null
    >({
      queryKey: this.resultKey(userId, query, target, filters),
      initialPageParam: null as SearchPageCursor | null,
      queryFn: ({ pageParam, signal }) =>
        searchService.searchPage(
          query,
          target,
          pageParam,
          filters,
          searchPageSize,
          signal,
        ),
      getNextPageParam: (lastPage: SearchPage) =>
        lastPage.nextCursor ?? undefined,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    });
  }

  invalidateHistory(queryClient: QueryClient, userId: string): Promise<void> {
    return queryClient.invalidateQueries({
      queryKey: this.historyKey(userId),
    });
  }
}

export const searchCacheService = new SearchCacheService();
