import type { Json } from '../../../types/database.types';
import type { EventDispatcher } from './eventDispatcher';
import type { RealtimeChannel } from './realtimeChannelFactory';

type VideoRealtimeRow = {
  id?: unknown;
  user_id?: unknown;
  status?: unknown;
  deleted_at?: unknown;
  caption?: unknown;
  title?: unknown;
  description?: unknown;
  visibility?: unknown;
  likes_count?: unknown;
  comments_count?: unknown;
  views_count?: unknown;
};

export type VideoRealtimeChange =
  | {
      type: 'VIDEO_CREATED';
      payload: { videoId: string; userId: string };
    }
  | { type: 'VIDEO_UPDATED'; payload: { videoId: string; changes: Json } }
  | { type: 'VIDEO_DELETED'; payload: { videoId: string } };

function isRow(value: unknown): value is VideoRealtimeRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReady(row: VideoRealtimeRow | null): boolean {
  return (
    row?.status === 'ready' &&
    (row.deleted_at === undefined || row.deleted_at === null)
  );
}

function getChanges(
  row: VideoRealtimeRow,
  previous: VideoRealtimeRow | null,
): Json {
  const changes: { [key: string]: Json } = {};
  for (const key of [
    'caption',
    'title',
    'description',
    'visibility',
    'likes_count',
    'comments_count',
    'views_count',
  ] as const) {
    const value = row[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      if (key === 'visibility' && previous?.visibility === undefined) {
        continue;
      }
      if (previous?.[key] === value) {
        continue;
      }
      changes[key] = value;
    }
  }
  return changes;
}

export function mapVideoRealtimeChange(
  eventType: string,
  newValue: unknown,
  oldValue?: unknown,
): VideoRealtimeChange | null {
  const next = isRow(newValue) ? newValue : null;
  const previous = isRow(oldValue) ? oldValue : null;
  const videoId =
    (eventType === 'DELETE' ? previous?.id : next?.id) ??
    previous?.id ??
    next?.id;

  if (typeof videoId !== 'string') {
    return null;
  }

  if (eventType === 'DELETE') {
    return { type: 'VIDEO_DELETED', payload: { videoId } };
  }

  if (eventType === 'INSERT') {
    if (!isReady(next) || typeof next?.user_id !== 'string') {
      return null;
    }
    return {
      type: 'VIDEO_CREATED',
      payload: { videoId, userId: next.user_id },
    };
  }

  if (eventType !== 'UPDATE' || !next) {
    return null;
  }

  if (
    !isReady(next) &&
    previous &&
    (previous.status === 'ready' || previous.status === undefined)
  ) {
    return { type: 'VIDEO_DELETED', payload: { videoId } };
  }
  if (!isReady(next)) {
    return null;
  }
  if (!previous || previous.status === undefined) {
    return {
      type: 'VIDEO_UPDATED',
      payload: { videoId, changes: getChanges(next, previous) },
    };
  }
  if (!isReady(previous)) {
    if (typeof next.user_id !== 'string') {
      return null;
    }
    return {
      type: 'VIDEO_CREATED',
      payload: { videoId, userId: next.user_id },
    };
  }
  return {
    type: 'VIDEO_UPDATED',
    payload: { videoId, changes: getChanges(next, previous) },
  };
}

export class FeedRealtimeService {
  setup(channel: RealtimeChannel, events: EventDispatcher): void {
    for (const eventType of ['INSERT', 'UPDATE', 'DELETE'] as const) {
      channel.on(
        'postgres_changes',
        { event: eventType, schema: 'public', table: 'videos' },
        (payload) => {
          const change = mapVideoRealtimeChange(
            eventType,
            payload.new,
            payload.old,
          );
          if (!change) {
            return;
          }
          events.dispatch(change.type, change.payload);
        },
      );
    }
  }
}

export const feedRealtimeService = new FeedRealtimeService();
