import type { Json } from '../../../types/database.types';

export type RealtimeEventPayloads = {
  VIDEO_CREATED: { videoId: string; userId: string };
  VIDEO_UPDATED: { videoId: string; changes: Json };
  VIDEO_DELETED: { videoId: string };
  COMMENT_CREATED: { commentId: string; videoId: string; authorId: string };
  COMMENT_UPDATED: { commentId: string; videoId: string; changes: Json };
  COMMENT_DELETED: { commentId: string; videoId: string };
  LIKE_CREATED: { videoId: string; userId: string };
  LIKE_REMOVED: { videoId: string; userId: string };
  BOOKMARK_CREATED: { videoId: string; userId: string };
  BOOKMARK_REMOVED: { videoId: string; userId: string };
  FOLLOW_CREATED: { followerId: string; followedId: string };
  FOLLOW_REMOVED: { followerId: string; followedId: string };
  NOTIFICATION_CREATED: { notificationId: string; recipientId: string };
  NOTIFICATION_UPDATED: { notificationId: string; recipientId: string };
  MESSAGE_RECEIVED: {
    messageId: string;
    conversationId: string;
    senderId: string;
  };
  USER_ONLINE: { userId: string; onlineAt: string };
  USER_OFFLINE: { userId: string; lastSeenAt: string };
};

export type RealtimeEventName = keyof RealtimeEventPayloads;

export type RealtimeEvent<T extends RealtimeEventName = RealtimeEventName> = {
  [EventName in T]: {
    type: EventName;
    payload: RealtimeEventPayloads[EventName];
    receivedAt: number;
  };
}[T];

export type RealtimeEventHandler<T extends RealtimeEventName> = (
  event: RealtimeEvent<T>,
) => void;
