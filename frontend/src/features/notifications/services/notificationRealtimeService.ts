import type { EventDispatcher } from '../../realtime/services/eventDispatcher';

type NotificationRowPayload = {
  id?: unknown;
  recipient_id?: unknown;
};

type NotificationRealtimeChange = {
  type: 'NOTIFICATION_CREATED' | 'NOTIFICATION_UPDATED';
  payload: { notificationId: string; recipientId: string };
};

export function mapRealtimeNotificationChange(
  eventType: string,
  row: unknown,
): NotificationRealtimeChange | null {
  if (
    (eventType !== 'INSERT' && eventType !== 'UPDATE') ||
    typeof row !== 'object' ||
    row === null
  ) {
    return null;
  }

  const notification = row as NotificationRowPayload;
  if (
    typeof notification.id !== 'string' ||
    typeof notification.recipient_id !== 'string'
  ) {
    return null;
  }

  return {
    type:
      eventType === 'INSERT' ? 'NOTIFICATION_CREATED' : 'NOTIFICATION_UPDATED',
    payload: {
      notificationId: notification.id,
      recipientId: notification.recipient_id,
    },
  };
}

export class NotificationRealtimeService {
  private readonly processedNotificationIds = new Set<string>();
  private readonly maximumRememberedIds = 512;

  dispatchChange(
    events: Pick<EventDispatcher, 'dispatch'>,
    eventType: string,
    row: unknown,
  ): void {
    const change = mapRealtimeNotificationChange(eventType, row);
    if (!change) {
      return;
    }

    if (change.type === 'NOTIFICATION_CREATED') {
      if (this.processedNotificationIds.has(change.payload.notificationId)) {
        return;
      }
      this.processedNotificationIds.add(change.payload.notificationId);
      if (this.processedNotificationIds.size > this.maximumRememberedIds) {
        const oldestId = this.processedNotificationIds.values().next().value;
        if (oldestId) {
          this.processedNotificationIds.delete(oldestId);
        }
      }
      events.dispatch('NOTIFICATION_CREATED', change.payload);
      return;
    }

    events.dispatch('NOTIFICATION_UPDATED', change.payload);
  }
}

export const notificationRealtimeService = new NotificationRealtimeService();
