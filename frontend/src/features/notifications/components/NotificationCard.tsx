import { Check, Trash2 } from 'lucide-react';
import { memo } from 'react';
import Link from 'next/link';
import { paths } from '../../../constants/paths.js';
import Button from '../../../components/ui/Button';
import { notificationFormatter } from '../services/notificationFormatter';
import { NotificationAvatar } from './NotificationAvatar';
import type { Notification } from '../types';

type NotificationCardProps = {
  isDeletePending: boolean;
  isReadPending: boolean;
  notification: Notification;
  onDelete: (notificationId: string) => void;
  onSetRead: (notificationId: string, isRead: boolean) => void;
};

function NotificationCardComponent({
  isDeletePending,
  isReadPending,
  notification,
  onDelete,
  onSetRead,
}: NotificationCardProps) {
  const presentation = notificationFormatter.format(notification);
  const isRead = notification.readAt !== null;

  return (
    <article
      aria-label={`${isRead ? 'Read' : 'Unread'} notification: ${presentation.content}`}
      className={`flex gap-3 rounded-card border p-4 transition-colors ${
        isRead
          ? 'border-border bg-surface'
          : 'border-primary/20 bg-primary/[0.04]'
      }`}
    >
      {notification.actor ? (
        <Link
          aria-label={`View ${notification.actor.displayName}'s profile`}
          className="h-11 w-11 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href={paths.creatorProfile(notification.actor.username)}
        >
          <NotificationAvatar actor={notification.actor} />
        </Link>
      ) : (
        <NotificationAvatar actor={notification.actor} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-foreground">
          {presentation.content}
        </p>
        {notification.actor && (
          <Link
            className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-primary hover:underline"
            href={paths.creatorProfile(notification.actor.username)}
          >
            View {notification.actor.displayName}&apos;s profile
          </Link>
        )}
        <time
          className="mt-1 block text-xs text-muted"
          dateTime={notification.createdAt}
        >
          {notificationFormatter.formatTime(notification.createdAt)}
        </time>
        {presentation.href && (
          <Link
            className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            href={presentation.href}
            onClick={() => {
              if (!isRead) {
                onSetRead(notification.id, true);
              }
            }}
          >
            View video
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-1">
        <Button
          aria-label={`Mark notification as ${isRead ? 'unread' : 'read'}`}
          className="h-9 min-h-9 w-9"
          disabled={isReadPending}
          onClick={() => onSetRead(notification.id, !isRead)}
          size="icon"
          title={`Mark as ${isRead ? 'unread' : 'read'}`}
          variant="ghost"
        >
          <Check aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          aria-label="Delete notification"
          className="h-9 min-h-9 w-9"
          disabled={isDeletePending}
          onClick={() => onDelete(notification.id)}
          size="icon"
          title="Delete notification"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

export const NotificationCard = memo(NotificationCardComponent);
NotificationCard.displayName = 'NotificationCard';
