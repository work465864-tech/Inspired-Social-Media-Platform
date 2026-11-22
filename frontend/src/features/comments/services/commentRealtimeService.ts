import type { EventDispatcher } from '../../realtime/services/eventDispatcher';
import type { CommentRealtimeChange } from '../types';

type CommentRowPayload = {
  id?: unknown;
  video_id?: unknown;
  user_id?: unknown;
  content?: unknown;
  updated_at?: unknown;
  deleted_at?: unknown;
};

function isCommentRow(value: unknown): value is CommentRowPayload {
  return typeof value === 'object' && value !== null;
}

export function extractVideoCommentsCount(changes: unknown): number | null {
  if (
    typeof changes !== 'object' ||
    changes === null ||
    Array.isArray(changes)
  ) {
    return null;
  }
  const count = (changes as Record<string, unknown>).comments_count;
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
    ? count
    : null;
}

export function mapRealtimeCommentChange(
  eventType: string,
  row: unknown,
): CommentRealtimeChange | null {
  if (
    !isCommentRow(row) ||
    typeof row.id !== 'string' ||
    typeof row.video_id !== 'string'
  ) {
    return null;
  }

  if (eventType === 'INSERT' && typeof row.user_id === 'string') {
    return {
      type: 'COMMENT_CREATED',
      payload: {
        commentId: row.id,
        videoId: row.video_id,
        authorId: row.user_id,
      },
    };
  }

  if (eventType === 'UPDATE') {
    if (typeof row.deleted_at === 'string') {
      return {
        type: 'COMMENT_DELETED',
        payload: { commentId: row.id, videoId: row.video_id },
      };
    }

    return {
      type: 'COMMENT_UPDATED',
      payload: {
        commentId: row.id,
        videoId: row.video_id,
        changes: {
          ...(typeof row.content === 'string' ? { content: row.content } : {}),
          ...(typeof row.updated_at === 'string'
            ? { updated_at: row.updated_at }
            : {}),
        },
      },
    };
  }

  return null;
}

export function mapRealtimeVideoCommentsCount(
  value: unknown,
): { videoId: string; count: number } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const count = extractVideoCommentsCount(row);
  if (typeof row.id !== 'string' || count === null) {
    return null;
  }

  return { videoId: row.id, count };
}

export class CommentRealtimeService {
  dispatchCommentChange(
    events: Pick<EventDispatcher, 'dispatch'>,
    eventType: string,
    row: unknown,
  ): void {
    const change = mapRealtimeCommentChange(eventType, row);
    if (!change) {
      return;
    }

    switch (change.type) {
      case 'COMMENT_CREATED':
        events.dispatch('COMMENT_CREATED', change.payload);
        break;
      case 'COMMENT_UPDATED':
        events.dispatch('COMMENT_UPDATED', change.payload);
        break;
      case 'COMMENT_DELETED':
        events.dispatch('COMMENT_DELETED', change.payload);
        break;
    }
  }

  dispatchVideoCount(
    events: Pick<EventDispatcher, 'dispatch'>,
    row: unknown,
  ): void {
    const change = mapRealtimeVideoCommentsCount(row);
    if (change) {
      events.dispatch('VIDEO_UPDATED', {
        videoId: change.videoId,
        changes: { comments_count: change.count },
      });
    }
  }
}

export const commentRealtimeService = new CommentRealtimeService();
