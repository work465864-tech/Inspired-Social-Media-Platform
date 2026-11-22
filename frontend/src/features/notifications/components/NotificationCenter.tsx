'use client';

import { useState } from 'react';
import { CheckCheck, Settings2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../providers/ToastProvider';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
import { NotificationList } from './NotificationList';
import { NotificationSettings } from './NotificationSettings';

export function NotificationCenter() {
  const [showSettings, setShowSettings] = useState(false);
  const {
    count,
    error: countError,
    isError: countIsError,
    refetch: refetchCount,
  } = useUnreadCount();
  const { markAllRead, isPending } = useMarkAsRead();
  const showToast = useToast();

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (error) {
      showToast({
        title: 'Could not mark notifications as read',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  return (
    <section aria-labelledby="notifications-title" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Your activity
          </p>
          <h1
            className="mt-2 text-3xl font-bold tracking-tight text-foreground"
            id="notifications-title"
          >
            Notifications
          </h1>
          <p className="mt-2 text-sm text-muted">
            {countIsError
              ? 'Unread count unavailable.'
              : count > 0
                ? `${count} unread ${count === 1 ? 'notification' : 'notifications'}`
                : 'You’re up to date.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            aria-expanded={showSettings}
            onClick={() => setShowSettings((visible) => !visible)}
            variant="secondary"
          >
            <Settings2 aria-hidden="true" className="h-4 w-4" />
            Settings
          </Button>
          <Button
            disabled={countIsError || count === 0 || isPending}
            onClick={() => void handleMarkAllRead()}
            variant="outline"
          >
            <CheckCheck aria-hidden="true" className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </header>
      {countIsError && (
        <p className="text-sm text-danger" role="alert">
          {countError instanceof Error
            ? countError.message
            : 'Could not load the unread notification count.'}{' '}
          <button
            className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => void refetchCount()}
            type="button"
          >
            Retry
          </button>
        </p>
      )}
      {showSettings && (
        <div id="notification-settings-panel">
          <NotificationSettings />
        </div>
      )}
      <NotificationList />
    </section>
  );
}
