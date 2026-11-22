import { describe, expect, it, vi } from 'vitest';
import {
  CommentRealtimeService,
  mapRealtimeCommentChange,
  mapRealtimeVideoCommentsCount,
} from './commentRealtimeService';

describe('comment realtime mapping', () => {
  it('maps visible inserts and updates to shared events', () => {
    expect(
      mapRealtimeCommentChange('INSERT', {
        id: 'comment-1',
        video_id: 'video-1',
        user_id: 'user-1',
      }),
    ).toEqual({
      type: 'COMMENT_CREATED',
      payload: {
        commentId: 'comment-1',
        videoId: 'video-1',
        authorId: 'user-1',
      },
    });
    expect(
      mapRealtimeCommentChange('UPDATE', {
        id: 'comment-1',
        video_id: 'video-1',
        content: 'Edited',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: null,
      }),
    ).toEqual({
      type: 'COMMENT_UPDATED',
      payload: {
        commentId: 'comment-1',
        videoId: 'video-1',
        changes: {
          content: 'Edited',
          updated_at: '2026-01-01T00:00:00Z',
        },
      },
    });
  });

  it('maps soft deletion and ignores malformed or unrelated payloads', () => {
    expect(
      mapRealtimeCommentChange('UPDATE', {
        id: 'comment-1',
        video_id: 'video-1',
        deleted_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({
      type: 'COMMENT_DELETED',
      payload: { commentId: 'comment-1', videoId: 'video-1' },
    });
    expect(mapRealtimeCommentChange('DELETE', {})).toBeNull();
    expect(mapRealtimeCommentChange('INSERT', { id: 'comment-1' })).toBeNull();
    expect(mapRealtimeCommentChange('UPDATE', null)).toBeNull();
  });

  it('validates absolute video counts and dispatches through the shared layer', () => {
    expect(
      mapRealtimeVideoCommentsCount({
        id: 'video-1',
        comments_count: 7,
      }),
    ).toEqual({ videoId: 'video-1', count: 7 });
    expect(
      mapRealtimeVideoCommentsCount({
        id: 'video-1',
        comments_count: -1,
      }),
    ).toBeNull();

    const dispatch = vi.fn();
    new CommentRealtimeService().dispatchCommentChange({ dispatch }, 'INSERT', {
      id: 'comment-1',
      video_id: 'video-1',
      user_id: 'user-1',
    });
    expect(dispatch).toHaveBeenCalledWith('COMMENT_CREATED', {
      commentId: 'comment-1',
      videoId: 'video-1',
      authorId: 'user-1',
    });
  });
});
