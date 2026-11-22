import type { Tables } from '../../types/database.types';

export type NotificationEventType = Tables<'notifications'>['event_type'];
export type NotificationFilter =
  'all' | 'likes' | 'comments' | 'follows' | 'system';

export type NotificationActor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
};

export type Notification = {
  id: string;
  recipientId: string;
  actorId: string | null;
  eventType: NotificationEventType;
  videoId: string | null;
  commentId: string | null;
  relatedUserId: string | null;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  actor: NotificationActor | null;
};

export type NotificationPage = {
  items: Notification[];
  nextOffset: number | null;
};

export type NotificationPreferences = {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  push: boolean;
  email: boolean;
};

export type NotificationServiceErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'not_found'
  | 'permission'
  | 'validation'
  | 'unexpected';
