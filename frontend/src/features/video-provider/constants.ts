export const videoPageSize = 12;
export const maximumVideoPageSize = 30;
export const maximumVideoSearchLength = 100;
export const minimumVideoSearchLength = 2;
export const pixabayCacheSeconds = 24 * 60 * 60;
export const pixabayRequestTimeoutMs = 8_000;
export const maximumPixabayHits = 500;
export const videoQueryStaleTimeMs = pixabayCacheSeconds * 1_000;
export const videoQueryGcTimeMs = pixabayCacheSeconds * 1_000;
export const hybridFeedStaleTimeMs = 45_000;
export const hybridFeedGcTimeMs = 10 * 60_000;

export const videoQueryKeys = {
  all: ['video-provider'] as const,
  feedPrefix: ['video-provider', 'hybrid-feed'] as const,
  feed: (userId = 'anonymous') =>
    ['video-provider', 'hybrid-feed', userId] as const,
  trending: ['video-provider', 'trending'] as const,
  search: (query: string) => ['video-provider', 'search', query] as const,
};
