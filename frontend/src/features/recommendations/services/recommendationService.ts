import { recommendationPageSize } from '../constants';
import type {
  RecommendationCursor,
  RecommendationItem,
  RecommendationPage,
} from '../types';
import { recommendationCache } from './recommendationCache';
import { recommendationEngine } from './recommendationEngine';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class RecommendationPageExpiredError extends Error {
  constructor() {
    super('This recommendation page expired. Refresh the For You feed.');
    this.name = 'RecommendationPageExpiredError';
  }
}

export class RecommendationService {
  async getPage(
    userId: string,
    cursor: RecommendationCursor | null,
    signal: AbortSignal,
    pageSize = recommendationPageSize,
  ): Promise<RecommendationPage> {
    this.validateRequest(userId, cursor, pageSize);
    if (signal.aborted) {
      throw (
        signal.reason ?? new Error('The recommendation request was cancelled.')
      );
    }

    if (cursor) {
      const cachedItems = recommendationCache.getSession(
        userId,
        cursor.sessionId,
      );
      if (!cachedItems) {
        throw new RecommendationPageExpiredError();
      }
      return this.createPage(
        cachedItems,
        cursor.sessionId,
        cursor.offset,
        pageSize,
      );
    }

    const items = await recommendationEngine.generate(userId, signal);
    const sessionId = recommendationCache.createSession(userId, items);
    return this.createPage(items, sessionId, 0, pageSize);
  }

  async getScore(
    userId: string,
    videoId: string,
    signal: AbortSignal,
  ): Promise<number | null> {
    if (!uuidPattern.test(userId) || !uuidPattern.test(videoId)) {
      throw new Error(
        'Valid user and video IDs are required for score lookup.',
      );
    }
    const cachedScore = recommendationCache.getScore(userId, videoId);
    if (cachedScore !== null) {
      return cachedScore;
    }

    const items = await recommendationEngine.generate(userId, signal);
    recommendationCache.createSession(userId, items);
    return recommendationCache.getScore(userId, videoId);
  }

  invalidateUser(userId: string): void {
    recommendationCache.invalidateUser(userId);
  }

  private validateRequest(
    userId: string,
    cursor: RecommendationCursor | null,
    pageSize: number,
  ): void {
    if (!uuidPattern.test(userId)) {
      throw new Error('A valid user is required for recommendations.');
    }
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 30 ||
      (cursor !== null &&
        (!uuidPattern.test(cursor.sessionId) ||
          !Number.isSafeInteger(cursor.offset) ||
          cursor.offset < 1 ||
          cursor.pageSize !== pageSize))
    ) {
      throw new Error('The recommendation page request is invalid.');
    }
  }

  private createPage(
    items: RecommendationItem[],
    sessionId: string,
    offset: number,
    pageSize: number,
  ): RecommendationPage {
    const pageItems = items.slice(offset, offset + pageSize);
    const nextOffset = offset + pageItems.length;

    return {
      items: pageItems,
      nextCursor:
        nextOffset < items.length
          ? { sessionId, offset: nextOffset, pageSize }
          : null,
    };
  }
}

export const recommendationService = new RecommendationService();
