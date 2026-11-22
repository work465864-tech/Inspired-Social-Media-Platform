import type {
  RecommendationItem,
  RecommendationSignals,
  ScoredRecommendation,
} from '../types';
import { recommendationWeights } from '../constants';

function categoryDiversityScore(
  categories: readonly string[],
  categoryCounts: ReadonlyMap<string, number>,
): number | null {
  if (categories.length === 0) {
    return null;
  }

  return (
    categories.reduce(
      (total, category) =>
        total + 1 / (1 + (categoryCounts.get(category) ?? 0)),
      0,
    ) / categories.length
  );
}

function isNewer(left: ScoredRecommendation, right: ScoredRecommendation) {
  return (
    Date.parse(left.candidate.video.createdAt) >
    Date.parse(right.candidate.video.createdAt)
  );
}

export class FeedAssembler {
  assemble(candidates: readonly ScoredRecommendation[]): RecommendationItem[] {
    const remaining = [...candidates];
    const creatorCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const assembled: RecommendationItem[] = [];

    while (remaining.length > 0) {
      let selectedIndex = 0;
      let selectedScore = -1;
      let selectedSignals: RecommendationSignals | null = null;

      for (let index = 0; index < remaining.length; index += 1) {
        const scored = remaining[index];
        const creatorId = scored.candidate.video.userId;
        const creatorDiversity = 1 / (1 + (creatorCounts.get(creatorId) ?? 0));
        const categoryDiversity = categoryDiversityScore(
          scored.candidate.categories,
          categoryCounts,
        );
        const creatorWeight = recommendationWeights.creatorDiversity;
        const categoryWeight =
          categoryDiversity === null
            ? 0
            : recommendationWeights.categoryDiversity;
        const diversityWeight = creatorWeight + categoryWeight;
        const score =
          scored.rawScore * (1 - diversityWeight) +
          creatorWeight * creatorDiversity * 100 +
          categoryWeight * (categoryDiversity ?? 0) * 100;

        if (
          score > selectedScore ||
          (score === selectedScore && isNewer(scored, remaining[selectedIndex]))
        ) {
          selectedIndex = index;
          selectedScore = score;
          selectedSignals = {
            ...scored.signals,
            creatorDiversity,
            categoryDiversity,
          };
        }
      }

      const [selected] = remaining.splice(selectedIndex, 1);
      if (!selected || !selectedSignals) {
        throw new Error('The recommendation batch could not be assembled.');
      }
      const video = selected.candidate.video;
      creatorCounts.set(
        video.userId,
        (creatorCounts.get(video.userId) ?? 0) + 1,
      );
      for (const category of selected.candidate.categories) {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
      assembled.push({
        video,
        score: selectedScore,
        rawScore: selected.rawScore,
        signals: selectedSignals,
        sources: selected.candidate.sources,
        categories: selected.candidate.categories,
      });
    }

    return assembled;
  }
}

export const feedAssembler = new FeedAssembler();
