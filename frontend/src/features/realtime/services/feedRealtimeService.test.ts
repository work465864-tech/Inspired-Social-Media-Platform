import { describe, expect, it } from 'vitest';
import { mapVideoRealtimeChange } from './feedRealtimeService';

describe('mapVideoRealtimeChange', () => {
  it('only announces videos once they become playable', () => {
    expect(
      mapVideoRealtimeChange('INSERT', {
        id: 'video-1',
        user_id: 'user-1',
        status: 'processing',
      }),
    ).toBeNull();
    expect(
      mapVideoRealtimeChange(
        'UPDATE',
        {
          id: 'video-1',
          user_id: 'user-1',
          status: 'ready',
        },
        {
          id: 'video-1',
          status: 'processing',
        },
      ),
    ).toEqual({
      type: 'VIDEO_CREATED',
      payload: { videoId: 'video-1', userId: 'user-1' },
    });
  });

  it('maps updates and removes unavailable videos', () => {
    expect(
      mapVideoRealtimeChange(
        'UPDATE',
        {
          id: 'video-1',
          status: 'ready',
          likes_count: 7,
          caption: 'Updated caption',
        },
        { id: 'video-1', status: 'ready' },
      ),
    ).toEqual({
      type: 'VIDEO_UPDATED',
      payload: {
        videoId: 'video-1',
        changes: { likes_count: 7, caption: 'Updated caption' },
      },
    });
    expect(
      mapVideoRealtimeChange(
        'UPDATE',
        { id: 'video-1', status: 'hidden' },
        { id: 'video-1', status: 'ready' },
      ),
    ).toEqual({
      type: 'VIDEO_DELETED',
      payload: { videoId: 'video-1' },
    });
    expect(
      mapVideoRealtimeChange('DELETE', {}, { id: 'video-1', status: 'ready' }),
    ).toEqual({
      type: 'VIDEO_DELETED',
      payload: { videoId: 'video-1' },
    });
  });

  it('handles updates when Postgres only returns the old primary key', () => {
    expect(
      mapVideoRealtimeChange(
        'UPDATE',
        { id: 'video-1', status: 'ready', likes_count: 2 },
        { id: 'video-1' },
      ),
    ).toEqual({
      type: 'VIDEO_UPDATED',
      payload: { videoId: 'video-1', changes: { likes_count: 2 } },
    });
  });
});
