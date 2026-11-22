import { describe, expect, it } from 'vitest';
import {
  mapRealtimeLikeChange,
  mapRealtimeVideoLikesCount,
} from './realtimeLikeMapper';

describe('mapRealtimeLikeChange', () => {
  it('maps valid inserts and deletes to the shared realtime events', () => {
    expect(
      mapRealtimeLikeChange('INSERT', {
        video_id: 'video-1',
        user_id: 'user-1',
      }),
    ).toEqual({
      type: 'LIKE_CREATED',
      payload: { videoId: 'video-1', userId: 'user-1' },
    });
    expect(
      mapRealtimeLikeChange('DELETE', {
        video_id: 'video-1',
        user_id: 'user-1',
      }),
    ).toEqual({
      type: 'LIKE_REMOVED',
      payload: { videoId: 'video-1', userId: 'user-1' },
    });
  });

  it('ignores malformed and unrelated table changes', () => {
    expect(mapRealtimeLikeChange('UPDATE', {})).toBeNull();
    expect(mapRealtimeLikeChange('INSERT', { video_id: 'video-1' })).toBeNull();
    expect(mapRealtimeLikeChange('DELETE', null)).toBeNull();
  });

  it('extracts absolute like counts from video updates', () => {
    expect(
      mapRealtimeVideoLikesCount({ id: 'video-1', likes_count: 7 }),
    ).toEqual({ videoId: 'video-1', count: 7 });
    expect(
      mapRealtimeVideoLikesCount({ id: 'video-1', likes_count: -1 }),
    ).toBeNull();
    expect(mapRealtimeVideoLikesCount(null)).toBeNull();
  });
});
