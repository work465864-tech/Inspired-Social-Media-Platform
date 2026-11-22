import { describe, expect, it } from 'vitest';
import { mapFollowRealtimeChange } from './followRealtimeService';

describe('mapFollowRealtimeChange', () => {
  it('only emits relationship changes for accepted follow rows', () => {
    expect(
      mapFollowRealtimeChange(
        'INSERT',
        {
          follower_id: 'user-1',
          following_id: 'user-2',
          status: 'pending',
        },
        {},
        'user-1',
      ),
    ).toBeNull();
    expect(
      mapFollowRealtimeChange(
        'UPDATE',
        {
          follower_id: 'user-1',
          following_id: 'user-2',
          status: 'accepted',
        },
        {
          follower_id: 'user-1',
          following_id: 'user-2',
          status: 'pending',
        },
        'user-2',
      ),
    ).toEqual({
      type: 'FOLLOW_CREATED',
      payload: { followerId: 'user-1', followedId: 'user-2' },
    });
  });

  it('ignores unrelated users and maps accepted relationship removal', () => {
    expect(
      mapFollowRealtimeChange(
        'INSERT',
        {
          follower_id: 'user-1',
          following_id: 'user-2',
          status: 'accepted',
        },
        {},
        'user-3',
      ),
    ).toBeNull();
    expect(
      mapFollowRealtimeChange(
        'DELETE',
        {},
        {
          follower_id: 'user-1',
          following_id: 'user-2',
          status: 'accepted',
        },
        'user-2',
      ),
    ).toEqual({
      type: 'FOLLOW_REMOVED',
      payload: { followerId: 'user-1', followedId: 'user-2' },
    });
  });
});
