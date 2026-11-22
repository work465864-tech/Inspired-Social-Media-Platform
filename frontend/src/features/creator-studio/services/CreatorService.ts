import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createUploadAdminClient } from '../../upload/services/uploadServerService';
import type { Database } from '../../../types/database.types';
import { CreatorApiError } from './creatorApiService';
import type {
  CreatorVideo,
  CreatorVideoEditorInput,
  CreatorVideoStatus,
} from '../types';

const pageSize = 20;
const pageMaximum = 5000;
type CreatorSupabaseClient = SupabaseClient<Database>;

function escapedSearch(value: string): string {
  return value.replace(/[\\%_,()]/g, '\\$&');
}

export class CreatorService {
  async getVideos(
    creatorId: string,
    params: {
      page: number;
      query: string;
      status: CreatorVideoStatus;
      sort: 'newest' | 'oldest' | 'most-viewed' | 'most-liked';
    },
  ) {
    if (
      !Number.isInteger(params.page) ||
      params.page < 1 ||
      params.page > pageMaximum
    ) {
      throw new CreatorApiError(
        400,
        'invalid_page',
        'The requested content page is invalid.',
      );
    }

    const admin = createUploadAdminClient();
    let request = admin
      .from('videos')
      .select(
        'id,title,caption,visibility,status,views_count,likes_count,comments_count,created_at,updated_at',
        { count: 'exact' },
      )
      .eq('user_id', creatorId)
      .is('deleted_at', null);

    if (params.status === 'drafts') {
      request = request.in('status', ['draft', 'processing', 'failed']);
    } else if (params.status !== 'all') {
      request = request.eq('status', params.status);
    }
    if (params.query.trim()) {
      const pattern = `%${escapedSearch(params.query.trim())}%`;
      request = request.or(`title.ilike.${pattern},caption.ilike.${pattern}`);
    }

    switch (params.sort) {
      case 'oldest':
        request = request
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });
        break;
      case 'most-viewed':
        request = request
          .order('views_count', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
        break;
      case 'most-liked':
        request = request
          .order('likes_count', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
        break;
      default:
        request = request
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
    }

    const {
      data: rows,
      error,
      count,
    } = await request.range(
      (params.page - 1) * pageSize,
      params.page * pageSize - 1,
    );
    if (error) {
      throw new CreatorApiError(
        503,
        'creator_videos_unavailable',
        'Your videos could not be loaded.',
      );
    }

    const ids = (rows ?? []).map((row) => row.id);
    const tagRows =
      ids.length === 0
        ? []
        : await admin
            .from('video_hashtags')
            .select('video_id,hashtags(slug)')
            .in('video_id', ids);
    if (tagRows && 'error' in tagRows && tagRows.error) {
      throw new CreatorApiError(
        503,
        'creator_hashtags_unavailable',
        'Video hashtags could not be loaded.',
      );
    }

    const hashtagsByVideo = new Map<string, string[]>();
    for (const row of tagRows && 'data' in tagRows
      ? (tagRows.data ?? [])
      : []) {
      const slug = row.hashtags?.slug;
      if (slug) {
        const tags = hashtagsByVideo.get(row.video_id) ?? [];
        tags.push(slug);
        hashtagsByVideo.set(row.video_id, tags);
      }
    }

    const items: CreatorVideo[] = (rows ?? []).flatMap((row) =>
      row.status === 'deleted'
        ? []
        : [
            {
              id: row.id,
              title: row.title,
              caption: row.caption,
              visibility: row.visibility,
              hashtags: hashtagsByVideo.get(row.id) ?? [],
              status: row.status,
              views: row.views_count,
              likes: row.likes_count,
              comments: row.comments_count,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            },
          ],
    );

    const total = count ?? 0;
    return {
      items,
      page: params.page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateVideo(
    supabase: CreatorSupabaseClient,
    videoId: string,
    input: CreatorVideoEditorInput,
  ): Promise<void> {
    const { error } = await supabase.rpc('update_my_video_metadata', {
      target_video_id: videoId,
      new_title: input.title,
      new_caption: input.caption,
      new_visibility: input.visibility,
      new_hashtags: input.hashtags,
    });
    if (error) {
      const status =
        error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 400;
      throw new CreatorApiError(
        status,
        'video_update_failed',
        status === 404
          ? 'That video is no longer available.'
          : status === 403
            ? 'You cannot edit this video.'
            : 'The video metadata could not be saved.',
      );
    }
  }

  async deleteVideo(
    supabase: CreatorSupabaseClient,
    videoId: string,
  ): Promise<void> {
    const { data, error } = await supabase.rpc('delete_my_video', {
      target_video_id: videoId,
    });
    if (error) {
      const status =
        error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 503;
      throw new CreatorApiError(
        status,
        'video_delete_failed',
        status === 404
          ? 'That video is no longer available.'
          : status === 403
            ? 'You cannot delete this video.'
            : 'The video could not be deleted.',
      );
    }
    if (!data) {
      throw new CreatorApiError(
        404,
        'video_not_found',
        'That video is no longer available.',
      );
    }
  }
}

export const creatorService = new CreatorService();
