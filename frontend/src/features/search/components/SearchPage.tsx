'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/hooks/useAuth';
import { useToast } from '../../../providers/ToastProvider';
import { searchMinimumLength } from '../constants';
import { paths } from '../../../constants/paths.js';
import { searchCacheService } from '../services/searchCacheService';
import {
  getSearchErrorMessage,
  normalizeSearchQuery,
} from '../services/searchUtils';
import type {
  SearchFilters as SearchFilterState,
  SearchSuggestion,
  SearchTab,
} from '../types';
import { useSearch } from '../hooks/useSearch';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';
import { useTrendingSearches } from '../hooks/useTrendingSearches';
import { SearchEmpty } from './SearchEmpty';
import { SearchError } from './SearchError';
import { SearchFilters } from './SearchFilters';
import { SearchHistory } from './SearchHistory';
import { SearchInput } from './SearchInput';
import { SearchLoading } from './SearchLoading';
import { SearchResultList } from './SearchResultList';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchTabs } from './SearchTabs';

type SearchPageProps = {
  initialQuery: string;
  initialTab: SearchTab;
};

export function SearchPage({ initialQuery, initialTab }: SearchPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const showToast = useToast();
  const userId = user?.id ?? null;
  const [query, setQuery] = useState(() => normalizeSearchQuery(initialQuery));
  const [tab, setTab] = useState<SearchTab>(initialTab);
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [filters, setFilters] = useState<SearchFilterState>({
    verifiedOnly: false,
    videoSort: 'recent',
  });
  const normalizedQuery = normalizeSearchQuery(query);
  const search = useSearch(query, tab, filters);
  const suggestions = useSearchSuggestions(query, isFocused);
  const history = useSearchHistory();
  const recordSearch = history.recordSearch;
  const clearSearchHistory = history.clearHistory;
  const refetchHistory = history.refetch;
  const trending = useTrendingSearches();
  const listboxId = 'connectly-search-suggestions';

  useEffect(() => {
    setQuery(normalizeSearchQuery(initialQuery));
    setTab(initialTab);
  }, [initialQuery, initialTab]);

  const changeQueryInUrl = useCallback(
    (value: string, selectedTab: SearchTab) => {
      const params = new URLSearchParams();
      params.set('q', value);
      params.set('tab', selectedTab);
      router.replace(`${paths.search}?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const showHistoryError = useCallback(
    (error: unknown) => {
      showToast({
        title: 'Search history could not be updated',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    },
    [showToast],
  );

  const handleSearch = useCallback(
    (value = query, selectedTab = tab) => {
      const normalized = normalizeSearchQuery(value);
      setQuery(normalized);
      setTab(selectedTab);
      setActiveSuggestionIndex(-1);
      setIsFocused(false);
      if (normalized.length < searchMinimumLength) {
        return;
      }

      changeQueryInUrl(normalized, selectedTab);
      if (userId) {
        const prefetch =
          selectedTab === 'top'
            ? searchCacheService.prefetchTop(queryClient, userId, normalized)
            : searchCacheService.prefetchResults(
                queryClient,
                userId,
                normalized,
                selectedTab,
                filters,
              );
        void prefetch;
      }
      void recordSearch(normalized).catch(showHistoryError);
    },
    [
      changeQueryInUrl,
      filters,
      query,
      queryClient,
      recordSearch,
      showHistoryError,
      tab,
      userId,
    ],
  );

  const handleTabChange = useCallback(
    (selectedTab: SearchTab) => {
      setTab(selectedTab);
      if (normalizedQuery.length >= searchMinimumLength) {
        changeQueryInUrl(normalizedQuery, selectedTab);
        if (userId) {
          const prefetch =
            selectedTab === 'top'
              ? searchCacheService.prefetchTop(
                  queryClient,
                  userId,
                  normalizedQuery,
                )
              : searchCacheService.prefetchResults(
                  queryClient,
                  userId,
                  normalizedQuery,
                  selectedTab,
                  filters,
                );
          void prefetch;
        }
      }
    },
    [changeQueryInUrl, filters, normalizedQuery, queryClient, userId],
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.href) {
        void recordSearch(suggestion.query).catch(showHistoryError);
        setIsFocused(false);
        router.push(suggestion.href);
        return;
      }
      handleSearch(suggestion.query, suggestion.tab);
    },
    [handleSearch, recordSearch, router, showHistoryError],
  );

  const clearHistory = useCallback(async () => {
    try {
      await clearSearchHistory();
    } catch (error) {
      showHistoryError(error);
    }
  }, [clearSearchHistory, showHistoryError]);

  const trendingSuggestions = useMemo<SearchSuggestion[]>(
    () =>
      trending.items.map((item) => ({
        id: item.id,
        label: item.query,
        description: `${item.count} recent videos`,
        query: item.query.replace(/^#/, ''),
        tab: 'hashtags',
      })),
    [trending.items],
  );

  const searchTarget = tab === 'top' ? 'videos' : tab;
  const isSuggestionsOpen =
    isFocused &&
    normalizedQuery.length >= searchMinimumLength &&
    (suggestions.isDebouncing ||
      suggestions.isFetching ||
      suggestions.items.length > 0 ||
      suggestions.isError);
  const searchLoading = search.isLoading && search.items.length === 0;

  return (
    <section
      aria-labelledby="search-page-title"
      className="mx-auto w-full max-w-4xl space-y-6"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Find your next favorite
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-foreground"
          id="search-page-title"
        >
          Search Connectly
        </h1>
      </header>

      <div className="relative">
        <form
          aria-label="Search Connectly"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
          role="search"
        >
          <SearchInput
            activeSuggestionIndex={activeSuggestionIndex}
            isLoading={
              search.isFetching ||
              suggestions.isFetching ||
              suggestions.isDebouncing
            }
            isSuggestionsOpen={isSuggestionsOpen}
            listboxId={listboxId}
            onActiveSuggestionChange={setActiveSuggestionIndex}
            onBlur={() => setIsFocused(false)}
            onChange={setQuery}
            onFocus={() => setIsFocused(true)}
            onSelectSuggestion={handleSuggestionSelect}
            onSubmit={() => handleSearch()}
            suggestions={suggestions.items}
            value={query}
          />
        </form>
        {isSuggestionsOpen && (
          <SearchSuggestions
            activeIndex={activeSuggestionIndex}
            error={
              suggestions.isError
                ? getSearchErrorMessage(suggestions.error)
                : null
            }
            id={listboxId}
            isLoading={suggestions.isFetching || suggestions.isDebouncing}
            items={suggestions.items}
            onActiveIndexChange={setActiveSuggestionIndex}
            onSelect={handleSuggestionSelect}
          />
        )}
      </div>

      {normalizedQuery.length === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <SearchHistory
            error={
              history.error instanceof Error ? history.error.message : null
            }
            isClearing={history.isClearing}
            isError={history.isError}
            isLoading={history.isLoading}
            items={history.recent}
            onClear={() => void clearHistory()}
            onRetry={() => void refetchHistory()}
            onSelect={(value) => handleSearch(value, 'top')}
          />
          <section
            aria-labelledby="trending-searches-title"
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <h2
              className="flex items-center gap-2 text-base font-semibold text-foreground"
              id="trending-searches-title"
            >
              <TrendingUp aria-hidden="true" className="h-4 w-4 text-primary" />
              Trending searches
            </h2>
            {trending.isError ? (
              <p className="mt-4 text-sm text-danger" role="alert">
                Trending searches are temporarily unavailable.
              </p>
            ) : trending.isLoading ? (
              <p className="mt-4 text-sm text-muted" role="status">
                Loading trending searches...
              </p>
            ) : trendingSuggestions.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-muted">
                Popular tags will appear as videos are shared.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {trendingSuggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm text-foreground hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/5"
                      onClick={() => handleSearch(item.query, item.tab)}
                      type="button"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {item.label}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {item.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : normalizedQuery.length < searchMinimumLength ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          Enter at least {searchMinimumLength} characters to search.
        </p>
      ) : (
        <div className="space-y-5">
          <SearchTabs onChange={handleTabChange} value={tab} />
          {tab !== 'top' && (
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              target={searchTarget}
            />
          )}
          <div
            aria-labelledby={`search-tab-${tab}`}
            role="tabpanel"
            tabIndex={0}
          >
            {searchLoading ? (
              <SearchLoading tab={tab} />
            ) : search.isError && search.items.length === 0 ? (
              <SearchError
                error={search.error}
                onRetry={() => void search.refetch()}
              />
            ) : search.items.length === 0 ? (
              <SearchEmpty query={search.query} target={tab} />
            ) : (
              <SearchResultList
                fetchNextPage={() => {
                  void search.fetchNextPage();
                }}
                hasNextPage={search.hasNextPage}
                isFetchNextPageError={search.isFetchNextPageError}
                isFetchingNextPage={search.isFetchingNextPage}
                items={search.items}
                tab={tab}
              />
            )}
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite" role="status">
        {search.items.length > 0
          ? `${search.items.length} search results loaded.`
          : ''}
      </p>
    </section>
  );
}
