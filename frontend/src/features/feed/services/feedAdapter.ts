import { feedManager, createFeedManager } from './feedManager';
import type { FeedAdapter } from '../types/feed';

export const mockFeedAdapter: FeedAdapter = {
  getPage: (request) => feedManager.getPage(request),
};

export function createMockFeedAdapter(totalCount: number): FeedAdapter {
  return createFeedManager(totalCount);
}
