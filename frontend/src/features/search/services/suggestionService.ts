import { searchService } from './searchService';
import type { SearchResult, SearchSuggestion } from '../types';
import { normalizeSearchQuery } from './searchUtils';

function toSuggestion(result: SearchResult): SearchSuggestion {
  if (result.kind === 'user') {
    return {
      id: `user:${result.user.id}`,
      label: `@${result.user.username}`,
      description: result.user.displayName,
      query: result.user.username,
      tab: 'people',
    };
  }
  if (result.kind === 'video') {
    const { video } = result;
    return {
      id: `video:${video.id}`,
      label: video.caption.trim() || `Video by @${video.profile.username}`,
      description: `@${video.profile.username}`,
      query: video.caption.trim() || video.profile.username,
      tab: 'videos',
      href: `/watch/${video.id}`,
    };
  }
  return {
    id: `hashtag:${result.hashtag.id}`,
    label: `#${result.hashtag.slug}`,
    description: 'Hashtag',
    query: result.hashtag.slug,
    tab: 'hashtags',
  };
}

export class SuggestionService {
  async getSuggestions(
    query: string,
    signal: AbortSignal,
  ): Promise<SearchSuggestion[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    const results = await searchService.searchTop(normalizedQuery, signal);
    return results.slice(0, 8).map(toSuggestion);
  }
}

export const suggestionService = new SuggestionService();
