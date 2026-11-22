'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { useToast } from '../../../providers/ToastProvider';
import { notificationService } from '../services/notificationService';
import type { Notification } from '../types';
import { NotificationToast } from './NotificationToast';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';

export function NotificationRealtimeListener() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notification, setNotification] = useState<Notification | null>(null);
  const showToast = useToast();
  const currentUserId = useRef(userId);
  const requestId = useRef(0);
  currentUserId.current = userId;
  useNotificationRealtime(userId);

  useEffect(() => {
    if (!userId) {
      requestId.current += 1;
    }
  }, [userId]);

  const onNotificationCreated = useCallback(
    (event: { payload: { notificationId: string; recipientId: string } }) => {
      if (!userId || event.payload.recipientId !== userId) {
        return;
      }
      const currentRequestId = ++requestId.current;
      void notificationService
        .getById(userId, event.payload.notificationId)
        .then((result) => {
          if (
            requestId.current === currentRequestId &&
            currentUserId.current === result.recipientId
          ) {
            setNotification(result);
          }
        })
        .catch(() => {
          if (
            requestId.current !== currentRequestId ||
            currentUserId.current !== userId
          ) {
            return;
          }
          setNotification(null);
          showToast({
            title: 'New notification',
            description: 'Open Notifications to view your latest activity.',
            variant: 'info',
          });
        });
    },
    [showToast, userId],
  );

  useRealtimeEvent('NOTIFICATION_CREATED', onNotificationCreated);

  const dismiss = useCallback(() => setNotification(null), []);
  const visibleNotification =
    notification?.recipientId === userId ? notification : null;

  return (
    <NotificationToast notification={visibleNotification} onDismiss={dismiss} />
  );
}
