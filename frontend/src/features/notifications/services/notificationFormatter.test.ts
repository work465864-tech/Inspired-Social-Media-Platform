import { describe, expect, it } from 'vitest';
import { notificationFormatter } from './notificationFormatter';
import type { Notification } from '../types';

const notification: Notification = {
  id: 'notice-1',
  recipientId: 'user-1',
  actorId: 'actor-1',
  eventType: 'comment',
  videoId: 'video-1',
  commentId: null,
  relatedUserId: null,
  message: null,
  readAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  actor: {
    id: 'actor-1',
    username: 'jules',
    displayName: 'Jules',
    avatarUrl: null,
    isVerified: false,
  },
};

describe('NotificationFormatter', () => {
  it('formats actor activity and links video notifications to the watch route', () => {
    expect(notificationFormatter.format(notification)).toEqual({
      content: 'Jules commented on your video',
      href: '/watch/video-1',
    });
  });

  it('uses the database message for system notifications and handles invalid time', () => {
    expect(
      notificationFormatter.format({
        ...notification,
        eventType: 'system',
        videoId: null,
        message: 'A scheduled update is ready.',
      }),
    ).toEqual({
      content: 'A scheduled update is ready.',
      href: null,
    });
    expect(notificationFormatter.formatTime('not-a-timestamp')).toBe(
      'Recently',
    );
  });
});
