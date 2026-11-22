import { describe, expect, it } from 'vitest';
import { mapRealtimeBookmarkChange } from './bookmarkRealtimeService';

describe('mapRealtimeBookmarkChange', () => {
  it('maps bookmark inserts and deletes to shared realtime events', () => {
    expect(
      mapRealtimeBookmarkChange('INSERT', {
        video_id: 'video-1',
        user_id: 'user-1',
      }),
    ).toEqual({
      type: 'BOOKMARK_CREATED',
      payload: { videoId: 'video-1', userId: 'user-1' },
    });
    expect(
      mapRealtimeBookmarkChange('DELETE', {
        video_id: 'video-1',
        user_id: 'user-1',
      }),
    ).toEqual({
      type: 'BOOKMARK_REMOVED',
      payload: { videoId: 'video-1', userId: 'user-1' },
    });
  });

  it('ignores malformed and unrelated table changes', () => {
    expect(mapRealtimeBookmarkChange('UPDATE', {})).toBeNull();
    expect(
      mapRealtimeBookmarkChange('INSERT', { video_id: 'video-1' }),
    ).toBeNull();
    expect(mapRealtimeBookmarkChange('DELETE', null)).toBeNull();
  });
});
