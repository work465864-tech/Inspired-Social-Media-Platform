import type { EventDispatcher } from './eventDispatcher';
import type { RealtimeChannel } from './realtimeChannelFactory';

type FollowRealtimeRow = {
  follower_id?: unknown;
  following_id?: unknown;
  status?: unknown;
};

export type FollowRealtimeChange =
  | {
      type: 'FOLLOW_CREATED';
      payload: { followerId: string; followedId: string };
    }
  | {
      type: 'FOLLOW_REMOVED';
      payload: { followerId: string; followedId: string };
    };

function isRow(value: unknown): value is FollowRealtimeRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mapFollowRealtimeChange(
  eventType: string,
  newValue: unknown,
  oldValue: unknown,
  currentUserId: string,
): FollowRealtimeChange | null {
  const next = isRow(newValue) ? newValue : null;
  const previous = isRow(oldValue) ? oldValue : null;
  const row = eventType === 'DELETE' ? previous : next;
  if (
    !row ||
    typeof row.follower_id !== 'string' ||
    typeof row.following_id !== 'string' ||
    (row.follower_id !== currentUserId && row.following_id !== currentUserId)
  ) {
    return null;
  }

  const wasAccepted = previous?.status === 'accepted';
  const isAccepted = next?.status === 'accepted';
  const changeType =
    eventType === 'INSERT'
      ? isAccepted
        ? 'FOLLOW_CREATED'
        : null
      : eventType === 'DELETE'
        ? previous?.status === 'accepted' || previous?.status === undefined
          ? 'FOLLOW_REMOVED'
          : null
        : eventType === 'UPDATE'
          ? !wasAccepted && isAccepted
            ? 'FOLLOW_CREATED'
            : (wasAccepted || previous?.status === undefined) &&
                next?.status !== 'accepted'
              ? 'FOLLOW_REMOVED'
              : null
          : null;

  if (!changeType) {
    return null;
  }
  return {
    type: changeType,
    payload: {
      followerId: row.follower_id,
      followedId: row.following_id,
    },
  };
}

export class FollowRealtimeService {
  setup(
    channel: RealtimeChannel,
    events: EventDispatcher,
    currentUserId: string,
  ): void {
    for (const eventType of ['INSERT', 'UPDATE', 'DELETE'] as const) {
      channel.on(
        'postgres_changes',
        { event: eventType, schema: 'public', table: 'follows' },
        (payload) => {
          const change = mapFollowRealtimeChange(
            eventType,
            payload.new,
            payload.old,
            currentUserId,
          );
          if (change) {
            events.dispatch(change.type, change.payload);
          }
        },
      );
    }
  }
}

export const followRealtimeService = new FollowRealtimeService();
