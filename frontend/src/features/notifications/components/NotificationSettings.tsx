'use client';

import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useToast } from '../../../providers/ToastProvider';
import { Switch } from '../../../components/ui/inputs/Switch';
import type { NotificationPreferences } from '../types';

const settings: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: 'likes',
    label: 'Likes',
    description: 'When someone likes your videos or comments.',
  },
  {
    key: 'comments',
    label: 'Comments and mentions',
    description: 'When someone comments, replies, or mentions you.',
  },
  {
    key: 'follows',
    label: 'Follows',
    description: 'When someone follows you or responds to a follow request.',
  },
  {
    key: 'push',
    label: 'Push notifications',
    description:
      'Saved for future browser push delivery; push is not enabled yet.',
  },
  {
    key: 'email',
    label: 'Email notifications',
    description: 'Saved preference for future email notification delivery.',
  },
];

export function NotificationSettings() {
  const { preferences, error, isLoading, isPending, updatePreference } =
    useNotificationSettings();
  const showToast = useToast();

  const update = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      await updatePreference(key, value);
    } catch (reason) {
      showToast({
        title: 'Could not save notification setting',
        description:
          reason instanceof Error
            ? reason.message
            : 'Try again when your connection is available.',
        variant: 'error',
      });
    }
  };

  return (
    <section
      aria-labelledby="notification-settings-title"
      className="rounded-card border border-border bg-surface p-5"
    >
      <h2
        className="text-base font-semibold text-foreground"
        id="notification-settings-title"
      >
        Notification settings
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Choose which activity can create notifications for your account.
      </p>
      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error.message}
        </p>
      )}
      <div
        aria-busy={isLoading || isPending}
        className="mt-4 divide-y divide-border"
      >
        {settings.map(({ key, label, description }) => (
          <div
            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            key={key}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted">
                {description}
              </p>
            </div>
            <Switch
              aria-label={label}
              checked={preferences[key]}
              disabled={isLoading || isPending}
              onChange={(event) => {
                void update(key, event.currentTarget.checked);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
