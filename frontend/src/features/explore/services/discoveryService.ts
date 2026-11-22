import type { ExploreCategorySlug } from '../types';
import { suggestionService } from './suggestionService';
import { trendingService } from './trendingService';

export class DiscoveryService {
  getTrendingVideos(category: ExploreCategorySlug, signal: AbortSignal) {
    return trendingService.getTrendingVideos(category, signal);
  }

  getTrendingCreators(signal: AbortSignal) {
    return trendingService.getTrendingCreators(signal);
  }

  getTrendingHashtags(signal: AbortSignal) {
    return trendingService.getTrendingHashtags(signal);
  }

  getSuggestedAccounts(userId: string, signal: AbortSignal) {
    return suggestionService.getSuggestedAccounts(userId, signal);
  }

  getPopularThisWeek(category: ExploreCategorySlug, signal: AbortSignal) {
    return trendingService.getPopularThisWeek(category, signal);
  }
}

export const discoveryService = new DiscoveryService();
