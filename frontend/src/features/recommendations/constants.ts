import type { RecommendationSignals } from './types';

export const recommendationPageSize = 12;
export const recommendationCandidateLimit = 36;
export const followingCandidateLimit = 24;
export const creatorCandidateLimit = 24;
export const followedCreatorLimit = 100;
export const randomExplorationLimit = 12;
export const recommendationCacheTtlMs = 5 * 60_000;
export const scoreCacheTtlMs = 5 * 60_000;
export const recommendationStaleTimeMs = 45_000;
export const maxBufferedAnalyticsEvents = 500;
export const recommendationModelVersion = 'weighted-v1';

export const recommendationWeights: Readonly<
  Record<keyof RecommendationSignals, number>
> = {
  watchTime: 0.12,
  completionRate: 0.1,
  likes: 0.06,
  comments: 0.05,
  shares: 0.05,
  bookmarks: 0.05,
  followStatus: 0.1,
  freshness: 0.1,
  trending: 0.1,
  creatorDiversity: 0.08,
  categoryDiversity: 0.05,
  videoQuality: 0.05,
  categoryAffinity: 0.09,
};
