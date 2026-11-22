import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Tables } from '../../../types/database.types';
import { CommentServiceError } from '../types/errors';
import type { Comment, CommentPage, CommentQueryRow } from '../types';
import { commentValidationService } from './commentValidationService';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pageSize = 30;
const commentSelection =
  'id,video_id,user_id,parent_comment_id,content,likes_count,deleted_at,created_at,updated_at,author:profiles!comments_user_id_fkey(id,username,full_name,avatar_url,is_verified)';

type VideoCommentCount = Pick<Tables<'videos'>, 'comments_count'>;

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function normalizeError(
  error: unknown,
  operation: 'read' | 'create' | 'update' | 'delete',
): CommentServiceError {
  if (error instanceof CommentServiceError) {
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
      : 'The comment request could not be completed.';
  const normalizedMessage = message.toLowerCase();

  if (
    isOffline() ||
    /failed to fetch|network|connection|timeout/.test(normalizedMessage)
  ) {
    return new CommentServiceError(
      'offline',
      'You are offline. Please reconnect and try again.',
    );
  }
  if (
    status === 401 ||
    normalizedMessage.includes('authentication') ||
    normalizedMessage.includes('sign in')
  ) {
    return new CommentServiceError(
      'unauthorized',
      'Sign in to manage comments.',
    );
  }
  if (code === '22023') {
    return new CommentServiceError(
      'validation',
      'Comments must contain between 1 and 2,000 characters.',
    );
  }
  if (
    (operation === 'update' || operation === 'delete') &&
    /comment.*(not available|not found|unavailable)/.test(normalizedMessage)
  ) {
    return new CommentServiceError(
      'comment_unavailable',
      'This comment is no longer available.',
    );
  }
  if (operation === 'create' && code === '23503') {
    return new CommentServiceError(
      'video_unavailable',
      'This video is no longer available for comments.',
    );
  }
  if (code === '42501' || status === 403) {
    return new CommentServiceError(
      'permission',
      operation === 'create'
        ? 'Comments are not available for this video or account.'
        : 'You do not have permission to change this comment.',
    );
  }
  if (
    normalizedMessage.includes('video is not available') ||
    normalizedMessage.includes('video not found')
  ) {
    return new CommentServiceError(
      'video_unavailable',
      'This video is no longer available for comments.',
    );
  }
  if (
    (operation === 'update' || operation === 'delete') &&
    code === 'PGRST116'
  ) {
    return new CommentServiceError(
      'comment_unavailable',
      'This comment is no longer available.',
    );
  }

  return new CommentServiceError('unexpected', message);
}

function validateId(value: string, label: 'video' | 'comment'): void {
  if (!uuidPattern.test(value)) {
    throw new CommentServiceError(
      label === 'video' ? 'video_unavailable' : 'comment_unavailable',
      label === 'video'
        ? 'This video is no longer available for comments.'
        : 'This comment is no longer available.',
    );
  }
}

function toComment(row: CommentQueryRow): Comment {
  return {
    id: row.id,
    videoId: row.video_id,
    userId: row.user_id,
    parentCommentId: row.parent_comment_id,
    content: row.content,
    likesCount: row.likes_count,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: row.author
      ? {
          id: row.author.id,
          username: row.author.username,
          displayName: row.author.full_name || row.author.username,
          avatarUrl: row.author.avatar_url,
          isVerified: row.author.is_verified,
        }
      : null,
  };
}

export class CommentService {
  async getCount(videoId: string, signal: AbortSignal): Promise<number> {
    validateId(videoId, 'video');
    const supabase = createSupabaseBrowserClient();

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('comments_count')
        .eq('id', videoId)
        .eq('status', 'ready')
        .is('deleted_at', null)
        .abortSignal(signal)
        .maybeSingle<VideoCommentCount>();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new CommentServiceError(
          'video_unavailable',
          'This video is no longer available for comments.',
        );
      }

      return Math.max(0, Number(data.comments_count));
    } catch (error) {
      throw normalizeError(error, 'read');
    }
  }

  async getPage(
    videoId: string,
    offset: number,
    signal: AbortSignal,
  ): Promise<CommentPage> {
    validateId(videoId, 'video');
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new CommentServiceError(
        'validation',
        'The comment page is invalid.',
      );
    }

    const supabase = createSupabaseBrowserClient();

    try {
      const [videoResult, commentsResult] = await Promise.all([
        supabase
          .from('videos')
          .select('comments_count')
          .eq('id', videoId)
          .eq('status', 'ready')
          .is('deleted_at', null)
          .abortSignal(signal)
          .maybeSingle<VideoCommentCount>(),
        supabase
          .from('comments')
          .select(commentSelection)
          .eq('video_id', videoId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1)
          .abortSignal(signal)
          .returns<CommentQueryRow[]>(),
      ]);

      if (videoResult.error) {
        throw videoResult.error;
      }
      if (!videoResult.data) {
        throw new CommentServiceError(
          'video_unavailable',
          'This video is no longer available for comments.',
        );
      }
      if (commentsResult.error) {
        throw commentsResult.error;
      }

      const items = (commentsResult.data ?? []).map(toComment);
      const totalCount = Math.max(0, Number(videoResult.data.comments_count));
      const nextOffset =
        offset + items.length < totalCount ? offset + items.length : null;

      return { items, totalCount, nextOffset };
    } catch (error) {
      throw normalizeError(error, 'read');
    }
  }

  async getComment(commentId: string, signal: AbortSignal): Promise<Comment> {
    validateId(commentId, 'comment');
    const supabase = createSupabaseBrowserClient();

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(commentSelection)
        .eq('id', commentId)
        .is('deleted_at', null)
        .abortSignal(signal)
        .maybeSingle<CommentQueryRow>();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new CommentServiceError(
          'comment_unavailable',
          'This comment is no longer available.',
        );
      }

      return toComment(data);
    } catch (error) {
      throw normalizeError(error, 'read');
    }
  }

  async create(
    videoId: string,
    userId: string,
    content: string,
  ): Promise<Comment> {
    validateId(videoId, 'video');
    const normalizedContent = commentValidationService.validate(content);
    if (!userId) {
      throw new CommentServiceError('unauthorized', 'Sign in to comment.');
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, userId);
      const { data, error } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          user_id: userId,
          content: normalizedContent,
        })
        .select(commentSelection)
        .single<CommentQueryRow>();

      if (error) {
        throw error;
      }
      return toComment(data);
    } catch (error) {
      throw normalizeError(error, 'create');
    }
  }

  async updateOwnComment(
    commentId: string,
    userId: string,
    content: string,
  ): Promise<Comment> {
    validateId(commentId, 'comment');
    const normalizedContent = commentValidationService.validate(content);
    if (!userId) {
      throw new CommentServiceError(
        'unauthorized',
        'Sign in to edit comments.',
      );
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, userId);
      const { data, error } = await supabase.rpc('edit_my_comment', {
        target_comment_id: commentId,
        new_content: normalizedContent,
      });

      if (error) {
        throw error;
      }
      if (data !== true) {
        throw new CommentServiceError(
          'comment_unavailable',
          'This comment is no longer available.',
        );
      }

      const { data: updatedComment, error: readError } = await supabase
        .from('comments')
        .select(commentSelection)
        .eq('id', commentId)
        .is('deleted_at', null)
        .single<CommentQueryRow>();

      if (readError) {
        throw readError;
      }
      return toComment(updatedComment);
    } catch (error) {
      throw normalizeError(error, 'update');
    }
  }

  async deleteOwnComment(commentId: string, userId: string): Promise<void> {
    validateId(commentId, 'comment');
    if (!userId) {
      throw new CommentServiceError(
        'unauthorized',
        'Sign in to delete comments.',
      );
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, userId);
      const { data, error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new CommentServiceError(
          'comment_unavailable',
          'This comment is no longer available.',
        );
      }
    } catch (error) {
      throw normalizeError(error, 'delete');
    }
  }

  private async assertCurrentUser(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    expectedUserId: string,
  ): Promise<void> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    if (data.user?.id !== expectedUserId) {
      throw new CommentServiceError(
        'unauthorized',
        'Your session changed. Refresh your session before changing comments.',
      );
    }
  }
}

export const commentService = new CommentService();
