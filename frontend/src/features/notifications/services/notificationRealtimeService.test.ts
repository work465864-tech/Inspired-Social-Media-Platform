import { describe, expect, it } from 'vitest';
import type {
  RealtimeEventName,
  RealtimeEventPayloads,
} from '../../realtime/types/events';
import {
  mapRealtimeNotificationChange,
  NotificationRealtimeService,
} from './notificationRealtimeService';

describe('notificationRealtimeService', () => {
  it('maps recipient-scoped insert and update rows and ignores malformed payloads', () => {
    expect(
      mapRealtimeNotificationChange('INSERT', {
        id: 'notice-1',
        recipient_id: 'user-1',
      }),
    ).toEqual({
      type: 'NOTIFICATION_CREATED',
      payload: { notificationId: 'notice-1', recipientId: 'user-1' },
    });
    expect(
      mapRealtimeNotificationChange('DELETE', {
        id: 'notice-1',
        recipient_id: 'user-1',
      }),
    ).toBeNull();
    expect(
      mapRealtimeNotificationChange('INSERT', { id: 'notice-1' }),
    ).toBeNull();
  });

  it('dispatches each created notification once while dispatching updates', () => {
    const service = new NotificationRealtimeService();
    const types: RealtimeEventName[] = [];
    const dispatch = <T extends RealtimeEventName>(
      type: T,
      payload: RealtimeEventPayloads[T],
    ) => {
      types.push(type);
      void payload;
    };
    const events = { dispatch };
    const row = { id: 'notice-1', recipient_id: 'user-1' };

    service.dispatchChange(events, 'INSERT', row);
    service.dispatchChange(events, 'INSERT', row);
    service.dispatchChange(events, 'UPDATE', row);

    expect(types).toEqual(['NOTIFICATION_CREATED', 'NOTIFICATION_UPDATED']);
  });
});
