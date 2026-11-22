import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { mediaService } from '../../feed/services/mediaService';
import { videoService } from '../../feed/services/videoService';
import type { Tables } from '../../../types/database.types';
import { withTimedRequest } from '../../feed/services/errorService';
import { searchMinimumLength, searchResultTimeoutMs } from '../constants';
import type {
  SearchFilters,
  SearchHashtag,
  SearchPage,
  SearchPageCursor,
  SearchResult,
  SearchTarget,
  SearchUser,
  VideoSearchSort,
} from '../types';
import {
  isValidSearchCursor,
  normalizeSearchError,
  normalizeSearchQuery,
  SearchError,
} from './searchUtils';

type ProfileRow = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'username'
  | 'full_name'
  | 'avatar_url'
  | 'is_verified'
  | 'is_private'
  | 'bio'
>;
type VideoSearchRow = Pick<
  Tables<'videos'>,
  'id' | 'created_at' | 'views_count'
>;
type HashtagRow = Pick<Tables<'hashtags'>, 'id' | 'slug'>;

const profileSelection =
  'id,username,full_name,avatar_url,is_verified,is_private,bio';
const minimumPageSize = 1;
const maximumPageSize = 50;

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function toSearchUser(row: ProfileRow): SearchUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.full_name.trim() || row.username,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    isPrivate: row.is_private,
    bio: row.bio,
  };
}

function emptySearchPage(): SearchPage {
  return { items: [], nextCursor: null };
}

export class SearchService {
  async searchPage(
    query: string,
    target: SearchTarget,
    cursor: SearchPageCursor | null,
    filters: SearchFilters,
    limit: number,
    signal: AbortSignal,
  ): Promise<SearchPage> {
    const normalizedQuery = normalizeSearchQuery(query);
    if (
      normalizedQuery.length < searchMinimumLength ||
      normalizedQuery.length > 120
    ) {
      return emptySearchPage();
    }
    if (
      !Number.isInteger(limit) ||
      limit < minimumPageSize ||
      limit > maximumPageSize ||
      !isValidSearchCursor(target, cursor, filters.videoSort)
    ) {
      throw new SearchError('validation', 'The search request is invalid.');
    }

    try {
      return await withTimedRequest(
        signal,
        searchResultTimeoutMs,
        (requestSignal) => {
          switch (target) {
            case 'people':
              return this.searchPeople(
                normalizedQuery,
                cursor,
                filters.verifiedOnly,
                limit,
                requestSignal,
              );
            case 'videos':
              return this.searchVideos(
                normalizedQuery,
                cursor,
                filters.videoSort,
                limit,
                requestSignal,
              );
            case 'hashtags':
              return this.searchHashtags(
                normalizedQuery,
                cursor,
                limit,
                requestSignal,
              );
          }
        },
      );
    } catch (error) {
      throw normalizeSearchError(error);
    }
  }

  async searchTop(query: string, signal: AbortSignal): Promise<SearchResult[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    if (normalizedQuery.length < searchMinimumLength) {
      return [];
    }
    const filters: SearchFilters = {
      verifiedOnly: false,
      videoSort: 'recent',
    };

    const [people, videos, hashtags] = await Promise.all([
      this.searchPage(normalizedQuery, 'people', null, filters, 5, signal),
      this.searchPage(normalizedQuery, 'videos', null, filters, 5, signal),
      this.searchPage(normalizedQuery, 'hashtags', null, filters, 5, signal),
    ]);

    return [...people.items, ...videos.items, ...hashtags.items];
  }

  private async searchPeople(
    query: string,
    cursor: SearchPageCursor | null,
    verifiedOnly: boolean,
    limit: number,
    signal: AbortSignal,
  ): Promise<SearchPage> {
    const supabase = createSupabaseBrowserClient();
    const pattern = `%${escapeLikePattern(query)}%`;
    let request = supabase
      .from('profiles')
      .select(profileSelection)
      .or(`username.ilike.${pattern},full_name.ilike.${pattern}`);

    if (verifiedOnly) {
      request = request.eq('is_verified', true);
    }
    if (cursor?.target === 'people') {
      request = request.gt('username', cursor.username);
    }

    const { data, error } = await request
      .order('username', { ascending: true })
      .limit(limit + 1)
      .abortSignal(signal)
      .returns<ProfileRow[]>();
    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items: SearchResult[] = pageRows.map((row) => ({
      kind: 'user',
      user: toSearchUser(row),
    }));
    const lastRow = pageRows.at(-1);
    return {
      items,
      nextCursor:
        hasMore && lastRow
          ? { target: 'people', username: lastRow.username }
          : null,
    };
  }

  private async searchVideos(
    query: string,
    cursor: SearchPageCursor | null,
    sort: VideoSearchSort,
    limit: number,
    signal: AbortSignal,
  ): Promise<SearchPage> {
    const supabase = createSupabaseBrowserClient();
    const pattern = `%${escapeLikePattern(query)}%`;
    let request = supabase
      .from('videos')
      .select('id,created_at,views_count')
      .ilike('caption', pattern)
      .eq('status', 'ready')
      .is('deleted_at', null);

    if (cursor?.target === 'videos') {
      request =
        cursor.sort === 'popular'
          ? request.or(
              `views_count.lt.${cursor.viewsCount},and(views_count.eq.${cursor.viewsCount},created_at.lt.${cursor.createdAt}),and(views_count.eq.${cursor.viewsCount},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
            )
          : request.or(
              `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
            );
    }

    request =
      sort === 'popular'
        ? request
            .order('views_count', { ascending: false })
            .order('created_at', { ascending: false })
        : request.order('created_at', { ascending: false });

    const { data, error } = await request
      .order('id', { ascending: false })
      .limit(limit + 1)
      .abortSignal(signal)
      .returns<VideoSearchRow[]>();
    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const videos = await videoService.getByIds(
      pageRows.map((row) => row.id),
      signal,
    );
    const hydratedVideos = await mediaService.hydrateThumbnails(videos, signal);
    const videoById = new Map(
      hydratedVideos.map((video) => [video.id, video] as const),
    );
    const items: SearchResult[] = pageRows.flatMap((row) => {
      const video = videoById.get(row.id);
      return video ? [{ kind: 'video' as const, video }] : [];
    });

    const lastRow = pageRows.at(-1);
    const nextCursor: SearchPageCursor | null =
      hasMore && lastRow
        ? sort === 'popular'
          ? {
              target: 'videos',
              sort,
              viewsCount: lastRow.views_count,
              createdAt: lastRow.created_at,
              id: lastRow.id,
            }
          : {
              target: 'videos',
              sort,
              createdAt: lastRow.created_at,
              id: lastRow.id,
            }
        : null;

    return { items, nextCursor };
  }

  private async searchHashtags(
    query: string,
    cursor: SearchPageCursor | null,
    limit: number,
    signal: AbortSignal,
  ): Promise<SearchPage> {
    const supabase = createSupabaseBrowserClient();
    let request = supabase
      .from('hashtags')
      .select('id,slug')
      .ilike('slug', `%${escapeLikePattern(query.toLowerCase())}%`);
    if (cursor?.target === 'hashtags') {
      request = request.gt('slug', cursor.slug);
    }

    const { data, error } = await request
      .order('slug', { ascending: true })
      .limit(limit + 1)
      .abortSignal(signal)
      .returns<HashtagRow[]>();
    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items: SearchResult[] = pageRows.map((hashtag: SearchHashtag) => ({
      kind: 'hashtag',
      hashtag,
    }));
    const lastRow = pageRows.at(-1);
    return {
      items,
      nextCursor:
        hasMore && lastRow ? { target: 'hashtags', slug: lastRow.slug } : null,
    };
  }
}

export const searchService = new SearchService();
