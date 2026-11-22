import type { Video } from '../feed/types/models';

export type RecommendationSource =
  'fresh' | 'following' | 'trending' | 'recommended_creator' | 'exploration';

export type RecommendationCursor = {
  sessionId: string;
  offset: number;
  pageSize: number;
};

export type RecommendationPage = {
  items: RecommendationItem[];
  nextCursor: RecommendationCursor | null;
};

export type RecommendationCandidate = {
  video: Video;
  sources: RecommendationSource[];
  tags: string[];
  categories: string[];
  followedCreator: boolean;
};

export type RecommendationSignals = {
  watchTime: number | null;
  completionRate: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  bookmarks: number | null;
  followStatus: number | null;
  freshness: number | null;
  trending: number | null;
  creatorDiversity: number | null;
  categoryDiversity: number | null;
  videoQuality: number | null;
  categoryAffinity: number | null;
};

export type ScoredRecommendation = {
  candidate: RecommendationCandidate;
  signals: RecommendationSignals;
  rawScore: number;
};

export interface RecommendationScoringStrategy {
  rank(
    candidates: readonly RecommendationCandidate[],
    interestProfile: InterestProfile,
    signal: AbortSignal,
  ): Promise<ScoredRecommendation[]>;
}

export type RecommendationItem = {
  video: Video;
  score: number;
  rawScore: number;
  signals: RecommendationSignals;
  sources: RecommendationSource[];
  categories: string[];
};

export type InterestProfile = {
  userId: string;
  isColdStart: boolean;
  interests: string[];
  preferredCategories: string[];
  languagePreference: string | null;
  regionPreference: string | null;
  updatedAt: string;
};

export type RecommendationEventInput =
  | {
      type: 'impression';
      userId: string;
      videoId: string;
      sessionId: string;
      position: number;
    }
  | {
      type: 'view';
      userId: string;
      videoId: string;
      sessionId: string;
    }
  | {
      type: 'watch_duration';
      userId: string;
      videoId: string;
      sessionId: string;
      durationMs: number;
    }
  | {
      type: 'skip' | 'replay';
      userId: string;
      videoId: string;
      sessionId: string;
    }
  | {
      type: 'like' | 'comment' | 'follow' | 'share' | 'bookmark';
      userId: string;
      videoId: string;
      sessionId: string;
    };

export type RecordedRecommendationEvent = RecommendationEventInput & {
  eventId: string;
  occurredAt: string;
};

export type RecommendationAnalyticsSink = (
  events: readonly RecordedRecommendationEvent[],
) => Promise<void>;
