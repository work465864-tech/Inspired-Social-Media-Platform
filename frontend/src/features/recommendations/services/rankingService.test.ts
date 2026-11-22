import { describe, expect, it } from 'vitest';
import type { Video } from '../../feed/types/models';
import { FeedAssembler } from './feedAssembler';
import { FreshnessScoreService } from './freshnessScoreService';
import { RankingService } from './rankingService';
import type {
  InterestProfile,
  RecommendationCandidate,
  RecommendationSignals,
  ScoredRecommendation,
} from '../types';

const userId = 'c0d3a43a-b378-4b89-9a7f-4d54d05a7c12';

function createVideo(id: string, creatorId: string, createdAt: string): Video {
  return {
    id,
    userId: creatorId,
    caption: 'Recommendation test video',
    visibility: 'public',
    status: 'ready',
    durationMs: 1_000,
    createdAt,
    updatedAt: createdAt,
    music: null,
    profile: {
      id: creatorId,
      username: 'creator',
      displayName: 'Creator',
      avatarUrl: null,
      isVerified: false,
      isPrivate: false,
      createdAt,
    },
    assets: [],
    stats: {
      viewsCount: 100,
      likesCount: 10,
      commentsCount: 2,
      sharesCount: null,
      bookmarksCount: null,
    },
  };
}

function createCandidate(
  video: Video,
  categories: string[] = [],
): RecommendationCandidate {
  return {
    video,
    sources: ['fresh'],
    tags: categories,
    categories,
    followedCreator: false,
  };
}

function createSignals(
  overrides: Partial<RecommendationSignals> = {},
): RecommendationSignals {
  return {
    watchTime: null,
    completionRate: null,
    likes: null,
    comments: null,
    shares: null,
    bookmarks: null,
    followStatus: null,
    freshness: null,
    trending: null,
    creatorDiversity: null,
    categoryDiversity: null,
    videoQuality: null,
    categoryAffinity: null,
    ...overrides,
  };
}

function createScored(
  video: Video,
  signals: RecommendationSignals,
  categories: string[] = [],
): ScoredRecommendation {
  return {
    candidate: createCandidate(video, categories),
    signals,
    rawScore: 50,
  };
}

const interestProfile: InterestProfile = {
  userId,
  isColdStart: true,
  interests: [],
  preferredCategories: [],
  languagePreference: 'en',
  regionPreference: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('recommendation ranking', () => {
  it('renormalizes weights when interaction signals are unavailable', () => {
    const service = new RankingService();

    expect(
      service.scoreSignals(createSignals({ likes: 1, followStatus: 0.5 })),
    ).toBe(68.75);
  });

  it('applies freshness half-life and clamps future videos to fully fresh', () => {
    const service = new FreshnessScoreService();
    const now = Date.parse('2026-01-04T00:00:00.000Z');

    expect(service.score('2026-01-01T00:00:00.000Z', now)).toBe(0.5);
    expect(service.score('2026-01-05T00:00:00.000Z', now)).toBe(1);
  });

  it('alternates creators when candidates have otherwise equal signals', () => {
    const assembler = new FeedAssembler();
    const commonSignals = createSignals({
      followStatus: 0,
      freshness: 1,
      trending: 1,
    });
    const firstCreator = 'd0d3a43a-b378-4b89-9a7f-4d54d05a7c12';
    const secondCreator = 'e0d3a43a-b378-4b89-9a7f-4d54d05a7c12';
    const candidates = [
      createScored(
        createVideo(
          'c1d3a43a-b378-4b89-9a7f-4d54d05a7c12',
          firstCreator,
          '2026-01-03T00:00:00.000Z',
        ),
        commonSignals,
      ),
      createScored(
        createVideo(
          'c2d3a43a-b378-4b89-9a7f-4d54d05a7c12',
          firstCreator,
          '2026-01-02T00:00:00.000Z',
        ),
        commonSignals,
      ),
      createScored(
        createVideo(
          'c3d3a43a-b378-4b89-9a7f-4d54d05a7c12',
          secondCreator,
          '2026-01-01T00:00:00.000Z',
        ),
        commonSignals,
      ),
    ];

    const items = assembler.assemble(candidates);
    expect(items[0].video.userId).toBe(firstCreator);
    expect(items[1].video.userId).toBe(secondCreator);
  });

  it('uses preferred topics as an affinity signal', () => {
    const service = new RankingService();
    const video = createVideo(
      'f0d3a43a-b378-4b89-9a7f-4d54d05a7c12',
      userId,
      '2026-01-03T00:00:00.000Z',
    );
    const candidate = createCandidate(video, ['dance', 'travel']);
    const profile = {
      ...interestProfile,
      isColdStart: false,
      preferredCategories: ['dance'],
    };

    expect(
      service.createSignals(candidate, profile, 0.5).categoryAffinity,
    ).toBe(1);
  });
});
