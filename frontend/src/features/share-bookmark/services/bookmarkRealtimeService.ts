import type { EventDispatcher } from '../../realtime/services/eventDispatcher';

type BookmarkRowPayload = {
  video_id?: unknown;
  user_id?: unknown;
};

function isBookmarkRow(value: unknown): value is BookmarkRowPayload {
  return typeof value === 'object' && value !== null;
}

export function mapRealtimeBookmarkChange(
  eventType: string,
  row: unknown,
): {
  type: 'BOOKMARK_CREATED' | 'BOOKMARK_REMOVED';
  payload: { videoId: string; userId: string };
} | null {
  if (
    (eventType !== 'INSERT' && eventType !== 'DELETE') ||
    !isBookmarkRow(row) ||
    typeof row.video_id !== 'string' ||
    typeof row.user_id !== 'string'
  ) {
    return null;
  }

  return {
    type: eventType === 'INSERT' ? 'BOOKMARK_CREATED' : 'BOOKMARK_REMOVED',
    payload: { videoId: row.video_id, userId: row.user_id },
  };
}

export class BookmarkRealtimeService {
  dispatchBookmarkChange(
    events: Pick<EventDispatcher, 'dispatch'>,
    eventType: string,
    row: unknown,
  ): void {
    const change = mapRealtimeBookmarkChange(eventType, row);
    if (change) {
      events.dispatch(change.type, change.payload);
    }
  }
}

export const bookmarkRealtimeService = new BookmarkRealtimeService();
