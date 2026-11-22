import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ConflictResolver } from '../../mutations/services/conflictResolver';
import { RollbackService } from '../../mutations/services/rollbackService';
import type { Notification, NotificationPage } from '../types';
import {
  removeCachedNotification,
  type NotificationPages,
  updateCachedNotification,
} from './notificationCache';

const notice: Notification = {
  id: 'notice-1',
  recipientId: 'user-1',
  actorId: null,
  eventType: 'system',
  videoId: null,
  commentId: null,
  relatedUserId: null,
  message: 'Update',
  readAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  actor: null,
};

describe('notification cache helpers', () => {
  it('updates and removes an item while leaving other pages intact', () => {
    const page: NotificationPage = { items: [notice], nextOffset: 1 };
    const pages: NotificationPages = {
      pages: [page, { items: [], nextOffset: null }],
      pageParams: [0, 30],
    };

    expect(
      updateCachedNotification(pages, notice.id, (item) => ({
        ...item,
        readAt: '2026-01-02T00:00:00.000Z',
      }))?.pages[0]?.items[0]?.readAt,
    ).toBe('2026-01-02T00:00:00.000Z');
    expect(removeCachedNotification(pages, notice.id)?.pages[0]?.items).toEqual(
      [],
    );
  });

  it('rolls back a failed optimistic notification update', () => {
    const client = new QueryClient();
    const key = ['notifications', 'list', 'user-1', 'all'];
    const pages: NotificationPages = {
      pages: [{ items: [notice], nextOffset: null }],
      pageParams: [0],
    };
    client.setQueryData(key, pages);

    const transaction = new RollbackService(
      client,
      new ConflictResolver(),
    ).createTransaction();
    transaction.update<NotificationPages>(
      key,
      (current) =>
        updateCachedNotification(current, notice.id, (item) => ({
          ...item,
          readAt: '2026-01-02T00:00:00.000Z',
        })) ?? { pages: [], pageParams: [] },
    );
    expect(
      client.getQueryData<NotificationPages>(key)?.pages[0]?.items[0]?.readAt,
    ).toBe('2026-01-02T00:00:00.000Z');

    transaction.rollback();
    expect(client.getQueryData(key)).toEqual(pages);
    client.clear();
  });
});
