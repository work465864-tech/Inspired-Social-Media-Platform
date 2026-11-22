import type { LikeRealtimeChange } from '../types';

type LikeRowPayload = {
  video_id?: unknown;
  user_id?: unknown;
};

function isLikeRow(value: unknown): value is LikeRowPayload {
  return typeof value === 'object' && value !== null;
}

export function mapRealtimeLikeChange(
  eventType: string,
  row: unknown,
): LikeRealtimeChange | null {
  if (
    (eventType !== 'INSERT' && eventType !== 'DELETE') ||
    !isLikeRow(row) ||
    typeof row.video_id !== 'string' ||
    typeof row.user_id !== 'string'
  ) {
    return null;
  }

  return {
    type: eventType === 'INSERT' ? 'LIKE_CREATED' : 'LIKE_REMOVED',
    payload: {
      videoId: row.video_id,
      userId: row.user_id,
    },
  };
}

export function mapRealtimeVideoLikesCount(
  value: unknown,
): { videoId: string; count: number } | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.likes_count !== 'number' ||
    !Number.isSafeInteger(row.likes_count) ||
    row.likes_count < 0
  ) {
    return null;
  }
  return { videoId: row.id, count: row.likes_count };
}
