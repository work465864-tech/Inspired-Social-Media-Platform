'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import Button from '../../../components/ui/Button';
import { notificationFormatter } from '../services/notificationFormatter';
import { NotificationAvatar } from './NotificationAvatar';
import type { Notification } from '../types';

type NotificationToastProps = {
  notification: Notification | null;
  onDismiss: () => void;
};

export function NotificationToast({
  notification,
  onDismiss,
}: NotificationToastProps) {
  useEffect(() => {
    if (!notification) {
      return;
    }
    const timeout = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timeout);
  }, [notification, onDismiss]);

  const presentation = notification
    ? notificationFormatter.format(notification)
    : null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[90] mx-auto w-[min(26rem,calc(100vw-2rem))]"
      role="status"
    >
      <AnimatePresence>
        {notification && presentation && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-soft"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: -8 }}
            key={notification.id}
            transition={{ duration: 0.18 }}
          >
            <NotificationAvatar actor={notification.actor} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                New notification
              </p>
              <p className="mt-1 text-sm leading-5 text-foreground">
                {presentation.content}
              </p>
              {presentation.href && (
                <Link
                  className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  href={presentation.href}
                  onClick={onDismiss}
                >
                  View video
                </Link>
              )}
            </div>
            <Button
              aria-label="Dismiss new notification"
              className="h-9 min-h-9 w-9"
              onClick={onDismiss}
              size="icon"
              variant="ghost"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
