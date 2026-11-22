import type { ReactNode } from 'react';

type NotificationBadgeProps = {
  children: ReactNode;
  count?: number;
};

export function NotificationBadge({ children, count }: NotificationBadgeProps) {
  const hasNotifications = count !== undefined && count > 0;

  return (
    <span className="relative inline-flex">
      {children}
      {hasNotifications && (
        <span
          aria-label={`${count} unread notifications`}
          className="absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-none text-accent-foreground"
          role="status"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  );
}
