import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Tables } from '../../../types/database.types';
import type { LikeErrorKind, VideoLikeState } from '../types';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VideoLikeRow = Pick<Tables<'likes'>, 'user_id'>;

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export class LikeServiceError extends Error {
  constructor(
    readonly kind: LikeErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'LikeServiceError';
  }
}

function normalizeError(error: unknown): LikeServiceError {
  if (error instanceof LikeServiceError) {
    return error;
  }

  const record =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown; message?: unknown; status?: unknown })
      : undefined;
  const code = typeof record?.code === 'string' ? record.code : '';
  const status = typeof record?.status === 'number' ? record.status : undefined;
  const message =
    typeof record?.message === 'string'
      ? record.message
      : 'The like request could not be completed.';
  const normalizedMessage = message.toLowerCase();

  if (
    isOffline() ||
    /failed to fetch|network|connection/.test(normalizedMessage)
  ) {
    return new LikeServiceError(
      'offline',
      'You are offline. Like changes will sync when connected.',
    );
  }
  if (status === 401 || normalizedMessage.includes('authentication')) {
    return new LikeServiceError('unauthorized', 'Sign in to like videos.');
  }
  if (
    normalizedMessage.includes('not available for liking') ||
    normalizedMessage.includes('not found')
  ) {
    return new LikeServiceError(
      'video_unavailable',
      'This video is no longer available for liking.',
    );
  }
  if (code === '42501' || status === 403) {
    return new LikeServiceError(
      'permission',
      'You do not have permission to like this video.',
    );
  }
  if (code === '23505') {
    return new LikeServiceError(
      'conflict',
      'The like state changed elsewhere.',
    );
  }
  return new LikeServiceError('unexpected', message);
}

function validateVideoId(videoId: string): void {
  if (!uuidPattern.test(videoId)) {
    throw new LikeServiceError(
      'video_unavailable',
      'This video is no longer available for liking.',
    );
  }
}

export class LikeService {
  async getVideoLikes(
    videoId: string,
    userId: string | null,
    signal: AbortSignal,
  ): Promise<VideoLikeState> {
    validateVideoId(videoId);
    const supabase = createSupabaseBrowserClient();
    try {
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('likes_count')
        .eq('id', videoId)
        .eq('status', 'ready')
        .is('deleted_at', null)
        .abortSignal(signal)
        .maybeSingle();

      if (videoError) {
        throw videoError;
      }
      if (!video) {
        throw new LikeServiceError(
          'video_unavailable',
          'This video is no longer available for liking.',
        );
      }

      let liked = false;
      if (userId) {
        const { data: like, error: likeError } = await supabase
          .from('likes')
          .select('user_id')
          .eq('video_id', videoId)
          .eq('user_id', userId)
          .abortSignal(signal)
          .maybeSingle<VideoLikeRow>();

        if (likeError) {
          throw likeError;
        }
        liked = like !== null;
      }

      return {
        liked,
        count: Math.max(0, Number(video.likes_count)),
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async toggleVideoLike(
    videoId: string,
    expectedUserId: string,
  ): Promise<boolean> {
    validateVideoId(videoId);
    if (!expectedUserId) {
      throw new LikeServiceError('unauthorized', 'Sign in to like videos.');
    }

    const supabase = createSupabaseBrowserClient();
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }
      if (authData.user?.id !== expectedUserId) {
        throw new LikeServiceError(
          'unauthorized',
          'Your session changed. Refresh your session before liking videos.',
        );
      }

      const { data, error } = await supabase.rpc('toggle_like', {
        target_video_id: videoId,
      });
      if (error) {
        throw error;
      }
      if (typeof data !== 'boolean') {
        throw new LikeServiceError(
          'unexpected',
          'The server returned an invalid like state.',
        );
      }
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  }
}

export const likeService = new LikeService();
