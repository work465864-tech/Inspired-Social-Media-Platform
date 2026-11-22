import { recommendationWeights } from '../constants';
import type {
  InterestProfile,
  RecommendationCandidate,
  RecommendationScoringStrategy,
  RecommendationSignals,
  ScoredRecommendation,
} from '../types';
import { freshnessScoreService } from './freshnessScoreService';
import { recommendationModelVersion } from '../constants';
import { recommendationCache } from './recommendationCache';
import { trendingScoreService } from './trendingScoreService';

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function engagementRate(count: number | null, views: number, scale: number) {
  return count === null ? null : clamp((count / Math.max(views, 1)) * scale);
}

export class RankingService implements RecommendationScoringStrategy {
  createSignals(
    candidate: RecommendationCandidate,
    interestProfile: InterestProfile,
    trendingScore: number,
  ): RecommendationSignals {
    const preferenceSet = new Set([
      ...interestProfile.interests,
      ...interestProfile.preferredCategories,
    ]);
    const matchingTags = candidate.tags.filter((tag) => preferenceSet.has(tag));
    const hasPreferences = preferenceSet.size > 0;

    return {
      watchTime: null,
      completionRate: null,
      likes: engagementRate(
        candidate.video.stats.likesCount,
        candidate.video.stats.viewsCount,
        8,
      ),
      comments: engagementRate(
        candidate.video.stats.commentsCount,
        candidate.video.stats.viewsCount,
        40,
      ),
      shares: engagementRate(
        candidate.video.stats.sharesCount,
        candidate.video.stats.viewsCount,
        20,
      ),
      bookmarks: engagementRate(
        candidate.video.stats.bookmarksCount,
        candidate.video.stats.viewsCount,
        20,
      ),
      followStatus: candidate.followedCreator ? 1 : 0,
      freshness: freshnessScoreService.score(candidate.video.createdAt),
      trending: clamp(trendingScore),
      creatorDiversity: null,
      categoryDiversity: null,
      videoQuality: null,
      categoryAffinity:
        hasPreferences && candidate.tags.length > 0
          ? matchingTags.length / preferenceSet.size
          : null,
    };
  }

  scoreSignals(signals: RecommendationSignals): number {
    let weightedTotal = 0;
    let availableWeight = 0;

    for (const signalName of Object.keys(
      recommendationWeights,
    ) as (keyof RecommendationSignals)[]) {
      const value = signals[signalName];
      if (value === null || !Number.isFinite(value)) {
        continue;
      }

      const weight = recommendationWeights[signalName];
      weightedTotal += clamp(value) * weight;
      availableWeight += weight;
    }

    if (availableWeight === 0) {
      throw new Error('Recommendation scoring requires at least one signal.');
    }

    return Math.round((weightedTotal / availableWeight) * 10_000) / 100;
  }

  async rank(
    candidates: readonly RecommendationCandidate[],
    interestProfile: InterestProfile,
    signal: AbortSignal,
  ): Promise<ScoredRecommendation[]> {
    if (signal.aborted) {
      throw signal.reason ?? new Error('The ranking request was cancelled.');
    }

    const trendingScores = trendingScoreService.scoreVideos(
      candidates.map((candidate) => candidate.video),
    );

    return candidates.map((candidate) => {
      const signals = this.createSignals(
        candidate,
        interestProfile,
        trendingScores.get(candidate.video.id) ?? 0,
      );
      const preferenceKey = [
        ...interestProfile.interests,
        ...interestProfile.preferredCategories,
      ]
        .sort()
        .join(',');
      const scoreKey = [
        recommendationModelVersion,
        candidate.video.id,
        interestProfile.updatedAt,
        preferenceKey,
      ].join(':');
      const cachedScore = recommendationCache.getScore(
        interestProfile.userId,
        scoreKey,
      );
      const rawScore = cachedScore ?? this.scoreSignals(signals);

      if (cachedScore === null) {
        recommendationCache.setScore(
          interestProfile.userId,
          scoreKey,
          rawScore,
        );
      }

      return { candidate, signals, rawScore };
    });
  }
}

export const rankingService = new RankingService();
