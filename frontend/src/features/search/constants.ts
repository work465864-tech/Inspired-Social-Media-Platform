export const searchPageSize = 20;
export const searchTopPageSize = 5;
export const searchMinimumLength = 3;
export const searchDebounceMs = 250;
export const suggestionDebounceMs = 180;
export const searchHistoryLimit = 12;
export const searchResultTimeoutMs = 12_000;

export const defaultSearchFilters = {
  verifiedOnly: false,
  videoSort: 'recent',
} as const;
