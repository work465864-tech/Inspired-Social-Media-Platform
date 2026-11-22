const freshnessHalfLifeHours = 72;
const millisecondsPerHour = 60 * 60 * 1000;

export class FreshnessScoreService {
  score(createdAt: string, now = Date.now()): number {
    const createdAtMs = Date.parse(createdAt);
    if (!Number.isFinite(createdAtMs) || !Number.isFinite(now)) {
      throw new Error('Freshness scoring requires valid timestamps.');
    }

    const ageHours = Math.max(0, (now - createdAtMs) / millisecondsPerHour);
    return Math.pow(0.5, ageHours / freshnessHalfLifeHours);
  }
}

export const freshnessScoreService = new FreshnessScoreService();
