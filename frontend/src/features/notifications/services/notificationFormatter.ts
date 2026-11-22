import type { Notification, NotificationEventType } from '../types';

export type NotificationPresentation = {
  content: string;
  href: string | null;
};

const relativeTime = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

const fallbackMessages: Record<NotificationEventType, string> = {
  like: 'liked your video',
  comment: 'commented on your video',
  comment_reply: 'replied to your comment',
  comment_like: 'liked your comment',
  follow: 'started following you',
  follow_request: 'requested to follow you',
  follow_accepted: 'accepted your follow request',
  mention: 'mentioned you',
  share: 'shared a video',
  video_upload_success: 'Your video is ready to watch.',
  system: 'A Connectly system update is available.',
  admin: 'An administrator sent an announcement.',
};

export class NotificationFormatter {
  format(notification: Notification): NotificationPresentation {
    const actor = notification.actor?.displayName ?? 'Someone';
    const content =
      notification.message?.trim() ||
      (notification.eventType === 'video_upload_success' ||
      notification.eventType === 'system' ||
      notification.eventType === 'admin'
        ? fallbackMessages[notification.eventType]
        : `${actor} ${fallbackMessages[notification.eventType]}`);

    return {
      content,
      href: notification.videoId ? `/watch/${notification.videoId}` : null,
    };
  }

  formatTime(createdAt: string, now = Date.now()): string {
    const timestamp = Date.parse(createdAt);
    if (!Number.isFinite(timestamp)) {
      return 'Recently';
    }

    const elapsedSeconds = Math.round((timestamp - now) / 1000);
    if (Math.abs(elapsedSeconds) < 60) {
      return relativeTime.format(elapsedSeconds, 'second');
    }
    if (Math.abs(elapsedSeconds) < 60 * 60) {
      return relativeTime.format(Math.round(elapsedSeconds / 60), 'minute');
    }
    if (Math.abs(elapsedSeconds) < 60 * 60 * 24) {
      return relativeTime.format(
        Math.round(elapsedSeconds / (60 * 60)),
        'hour',
      );
    }
    if (Math.abs(elapsedSeconds) < 60 * 60 * 24 * 7) {
      return relativeTime.format(
        Math.round(elapsedSeconds / (60 * 60 * 24)),
        'day',
      );
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(timestamp);
  }
}

export const notificationFormatter = new NotificationFormatter();
