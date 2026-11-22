import type { Tables } from '../../../types/database.types';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { mediaService } from '../../feed/services/mediaService';
import { normalizeFeedError } from '../../feed/services/errorService';
import { videoService } from '../../feed/services/videoService';
import {
  explorePageSize,
  exploreVideoTimeoutMs,
  popularVideoWindowDays,
  trendingVideoWindowHours,
} from '../constants';
import type {
  ExploreCategorySlug,
  ExploreVideoCursor,
  ExploreVideoPage,
  ExploreVideoSort,
} from '../types';
import { categoryService } from './categoryService';
import { withExploreTimeout } from './exploreUtils';

type ExploreVideoRow = Pick<
  Tables<'videos'>,
  'id' | 'user_id' | 'created_at' | 'views_count'
>;

const videoIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidCursor(
  cursor: ExploreVideoCursor | null,
  sort: ExploreVideoSort,
): boolean {
  return (
    cursor === null ||
    (cursor.sort === sort &&
      videoIdPattern.test(cursor.id) &&
      Number.isFinite(Date.parse(cursor.createdAt)) &&
      Number.isSafeInteger(cursor.viewsCount) &&
      cursor.viewsCount >= 0)
  );
}

function emptyPage(): ExploreVideoPage {
  return { items: [], nextCursor: null };
}

export class ExploreService {
  async getVideoPage(
    sort: ExploreVideoSort,
    category: ExploreCategorySlug,
    cursor: ExploreVideoCursor | null,
    signal: AbortSignal,
    pageSize = explorePageSize,
  ): Promise<ExploreVideoPage> {
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50 ||
      !isValidCursor(cursor, sort)
    ) {
      throw new Error('The Explore page request is invalid.');
    }

    try {
      return await withExploreTimeout(
        signal,
        exploreVideoTimeoutMs,
        async (requestSignal) => {
          const categoryId = await categoryService.getHashtagId(
            category,
            requestSignal,
          );
          if (category !== 'all' && categoryId === null) {
            return emptyPage();
          }

          const now = Date.now();
          const cutoff =
            sort === 'trending'
              ? new Date(
                  now - trendingVideoWindowHours * 60 * 60 * 1000,
                ).toISOString()
              : sort === 'popular'
                ? new Date(
                    now - popularVideoWindowDays * 24 * 60 * 60 * 1000,
                  ).toISOString()
                : null;
          const selection =
            categoryId === null
              ? 'id,user_id,created_at,views_count'
              : 'id,user_id,created_at,views_count,video_hashtags!inner(hashtag_id)';

          let query = createSupabaseBrowserClient()
            .from('videos')
            .select(selection)
            .eq('status', 'ready')
            .is('deleted_at', null);

          if (cutoff) {
            query = query.gte('created_at', cutoff);
          }
          if (categoryId !== null) {
            query = query.eq('video_hashtags.hashtag_id', categoryId);
          }
          if (cursor) {
            query =
              sort === 'recent'
                ? query.or(
                    `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
                  )
                : query.or(
                    `views_count.lt.${cursor.viewsCount},and(views_count.eq.${cursor.viewsCount},created_at.lt.${cursor.createdAt}),and(views_count.eq.${cursor.viewsCount},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
                  );
          }

          query =
            sort === 'recent'
              ? query.order('created_at', { ascending: false })
              : query
                  .order('views_count', { ascending: false })
                  .order('created_at', { ascending: false });

          const { data, error } = await query
            .order('id', { ascending: false })
            .limit(pageSize + 1)
            .abortSignal(requestSignal)
            .returns<ExploreVideoRow[]>();
          if (error) {
            throw error;
          }

          const rows = data ?? [];
          const hasMore = rows.length > pageSize;
          const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
          const ids = pageRows.map((row) => row.id);
          const hydratedVideos = await videoService.getByIds(
            ids,
            requestSignal,
          );
          const videosWithThumbnails = await mediaService.hydrateThumbnails(
            hydratedVideos,
            requestSignal,
          );
          const videoById = new Map(
            videosWithThumbnails.map((video) => [video.id, video] as const),
          );
          const items = ids.flatMap((id) => {
            const video = videoById.get(id);
            return video ? [video] : [];
          });
          const lastRow = pageRows.at(-1);

          return {
            items,
            nextCursor:
              hasMore && lastRow
                ? {
                    sort,
                    id: lastRow.id,
                    createdAt: lastRow.created_at,
                    viewsCount: lastRow.views_count,
                  }
                : null,
          };
        },
      );
    } catch (error) {
      throw normalizeFeedError(error);
    }
  }
}

export const exploreService = new ExploreService();
