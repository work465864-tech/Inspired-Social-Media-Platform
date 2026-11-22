import type {
  InterestProfile,
  RecommendationCandidate,
  RecommendationScoringStrategy,
  ScoredRecommendation,
} from '../types';
import { rankingService } from './rankingService';

export class RankingEngine {
  constructor(
    private readonly scoringStrategy: RecommendationScoringStrategy = rankingService,
  ) {}

  rank(
    candidates: readonly RecommendationCandidate[],
    interestProfile: InterestProfile,
    signal: AbortSignal,
  ): Promise<ScoredRecommendation[]> {
    return this.scoringStrategy.rank(candidates, interestProfile, signal);
  }
}

export const rankingEngine = new RankingEngine();
