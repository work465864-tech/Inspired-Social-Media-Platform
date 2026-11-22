import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Tables } from '../../../types/database.types';
import {
  FeedDataError,
  normalizeFeedError,
  withTimedRequest,
} from './errorService';
import { profileService } from './profileService';
import type { FeedCursor, Video } from '../types/models';

type ProfileRow = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'username'
  | 'full_name'
  | 'avatar_url'
  | 'is_verified'
  | 'is_private'
  | 'created_at'
>;

type AssetRow = Pick<
  Tables<'video_assets'>,
  | 'id'
  | 'video_id'
  | 'asset_type'
  | 'variant_key'
  | 'bucket_id'
  | 'object_path'
  | 'mime_type'
  | 'width'
  | 'height'
  | 'duration_ms'
>;

type VideoRow = Pick<
  Tables<'videos'>,
  | 'id'
  | 'user_id'
  | 'caption'
  | 'visibility'
  | 'status'
  | 'duration_ms'
  | 'views_count'
  | 'likes_count'
  | 'comments_count'
  | 'deleted_at'
  | 'created_at'
  | 'updated_at'
> & {
  profile: ProfileRow | null;
  video_assets: AssetRow[] | null;
};

const videoColumns = `
  id,user_id,caption,visibility,status,duration_ms,views_count,likes_count,
  comments_count,deleted_at,created_at,updated_at,
  profile:profiles!videos_user_id_fkey(
    id,username,full_name,avatar_url,is_verified,is_private,created_at
  ),
  video_assets(
    id,video_id,asset_type,variant_key,bucket_id,object_path,mime_type,
    width,height,duration_ms
  )
`;

const cursorTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapVideo(row: VideoRow): Video {
  if (!row.profile) {
    throw new FeedDataError(
      'invalid_data',
      'The video owner profile is unavailable.',
    );
  }

  const profile = profileService.map(row.profile);
  return {
    id: row.id,
    userId: row.user_id,
    caption: row.caption,
    visibility: row.visibility,
    status: row.status,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    music: null,
    profile,
    assets: (row.video_assets ?? []).map((asset) => ({
      id: asset.id,
      videoId: asset.video_id,
      type: asset.asset_type,
      variantKey: asset.variant_key,
      bucketId: asset.bucket_id,
      objectPath: asset.object_path,
      mimeType: asset.mime_type,
      width: asset.width,
      height: asset.height,
      durationMs: asset.duration_ms,
      signedUrl: null,
    })),
    stats: {
      viewsCount: row.views_count,
      likesCount: row.likes_count,
      commentsCount: row.comments_count,
      sharesCount: null,
      bookmarksCount: null,
    },
  };
}

function validateCursor(cursor: FeedCursor | null): void {
  if (
    cursor &&
    (!cursorTimestampPattern.test(cursor.createdAt) ||
      !Number.isFinite(Date.parse(cursor.createdAt)) ||
      !uuidPattern.test(cursor.id))
  ) {
    throw new FeedDataError('invalid_data', 'The feed cursor is invalid.');
  }
}

function validatePageSize(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new FeedDataError(
      'invalid_data',
      'Feed page size must be an integer between 1 and 50.',
    );
  }
}

export const videoService = {
  async getByIds(videoIds: string[], signal: AbortSignal): Promise<Video[]> {
    if (
      videoIds.length > 50 ||
      videoIds.some((videoId) => !uuidPattern.test(videoId))
    ) {
      throw normalizeFeedError({
        message: 'The requested video list is invalid.',
      });
    }
    if (videoIds.length === 0) {
      return [];
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('videos')
      .select(videoColumns)
      .in('id', videoIds)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .abortSignal(signal)
      .returns<VideoRow[]>();

    if (error) {
      throw normalizeFeedError(error);
    }

    return data.map(mapVideo);
  },

  async getPage(
    cursor: FeedCursor | null,
    limit: number,
    signal: AbortSignal,
  ): Promise<{ videos: Video[]; nextCursor: FeedCursor | null }> {
    try {
      validatePageSize(limit);
      validateCursor(cursor);
    } catch (error) {
      throw normalizeFeedError(error);
    }
    const supabase = createSupabaseBrowserClient();

    const rows = await withTimedRequest(
      signal,
      15_000,
      async (requestSignal) => {
        let query = supabase
          .from('videos')
          .select(videoColumns)
          .eq('status', 'ready')
          .is('deleted_at', null);

        if (cursor) {
          query = query.or(
            `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
          );
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(limit + 1)
          .abortSignal(requestSignal)
          .returns<VideoRow[]>();
        if (error) {
          throw error;
        }

        return data;
      },
    ).catch((error: unknown) => {
      throw normalizeFeedError(error);
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const videos = pageRows.map(mapVideo);
    const lastVideo = videos.at(-1);

    return {
      videos,
      nextCursor:
        hasMore && lastVideo
          ? { createdAt: lastVideo.createdAt, id: lastVideo.id }
          : null,
    };
  },

  async getById(videoId: string, signal: AbortSignal): Promise<Video> {
    if (!uuidPattern.test(videoId)) {
      throw normalizeFeedError({ status: 404 });
    }

    const supabase = createSupabaseBrowserClient();
    const row = await withTimedRequest(
      signal,
      15_000,
      async (requestSignal) => {
        const { data, error } = await supabase
          .from('videos')
          .select(videoColumns)
          .eq('id', videoId)
          .eq('status', 'ready')
          .is('deleted_at', null)
          .abortSignal(requestSignal)
          .maybeSingle()
          .returns<VideoRow | null>();

        if (error) {
          throw error;
        }

        return data;
      },
    );

    if (!row) {
      throw normalizeFeedError({ status: 404 });
    }

    return mapVideo(row);
  },
};
