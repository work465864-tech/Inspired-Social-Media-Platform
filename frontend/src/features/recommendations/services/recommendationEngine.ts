import type { InterestProfile, RecommendationItem } from '../types';
import { candidateGenerator } from './candidateGenerator';
import { feedAssembler } from './feedAssembler';
import { interestService } from './interestService';
import { rankingEngine } from './rankingEngine';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class RecommendationEngine {
  async generate(
    userId: string,
    signal: AbortSignal,
  ): Promise<RecommendationItem[]> {
    if (!uuidPattern.test(userId)) {
      throw new Error('A valid user is required for recommendations.');
    }
    if (signal.aborted) {
      throw (
        signal.reason ?? new Error('The recommendation request was cancelled.')
      );
    }

    const [candidates, interestProfile] = await Promise.all([
      candidateGenerator.generate(userId, signal),
      interestService.getProfile(userId, signal),
    ]);
    const rankedCandidates = await rankingEngine.rank(
      candidates,
      interestProfile,
      signal,
    );
    return feedAssembler.assemble(rankedCandidates);
  }

  async getInterestProfile(
    userId: string,
    signal: AbortSignal,
  ): Promise<InterestProfile> {
    return interestService.getProfile(userId, signal);
  }
}

export const recommendationEngine = new RecommendationEngine();
