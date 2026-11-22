import type { SearchFilters, SearchTarget } from '../types';

export const searchQueryKeys = {
  all: ['search'] as const,
  results: (
    userId: string | null,
    query: string,
    target: SearchTarget,
    filters: SearchFilters,
  ) => ['search', 'results', userId, query, target, filters] as const,
  top: (userId: string | null, query: string) =>
    ['search', 'top', userId, query] as const,
  suggestions: (userId: string | null, query: string) =>
    ['search', 'suggestions', userId, query] as const,
  history: (userId: string | null) => ['search', 'history', userId] as const,
  trending: (userId: string | null) => ['search', 'trending', userId] as const,
};
