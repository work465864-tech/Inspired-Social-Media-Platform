'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../providers/ToastProvider';
import { useDeleteNotification } from '../hooks/useDeleteNotification';
import { useMarkAsRead } from '../hooks/useMarkAsRead';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationFilter } from '../types';
import { NotificationCard } from './NotificationCard';
import { NotificationEmpty } from './NotificationEmpty';
import { NotificationSkeleton } from './NotificationSkeleton';

const filters: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
  { value: 'follows', label: 'Follows' },
  { value: 'system', label: 'System' },
];

export function NotificationList() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const list = useNotifications(filter);
  const { remove, isPending: isDeletePending } = useDeleteNotification();
  const { setRead, isPending: isReadPending } = useMarkAsRead();
  const showToast = useToast();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = list.fetchNextPage;
  const canLoadMore = list.hasNextPage && !list.isFetchingNextPage;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && canLoadMore) {
          void loadMore();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  const onSetRead = useCallback(
    async (notificationId: string, isRead: boolean) => {
      try {
        await setRead(notificationId, isRead);
      } catch (error) {
        showToast({
          title: 'Could not update notification',
          description:
            error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      }
    },
    [setRead, showToast],
  );
  const onDelete = useCallback(
    async (notificationId: string) => {
      try {
        await remove(notificationId);
        showToast({
          title: 'Notification deleted',
          variant: 'success',
        });
      } catch (error) {
        showToast({
          title: 'Could not delete notification',
          description:
            error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      }
    },
    [remove, showToast],
  );
  const filterLabel =
    filters.find((option) => option.value === filter)?.label ?? 'All';

  if (list.isLoading && list.items.length === 0) {
    return <NotificationSkeleton />;
  }

  if (list.isError && list.items.length === 0) {
    return (
      <div
        className="rounded-card border border-danger/30 bg-danger/5 p-5"
        role="alert"
      >
        <p className="text-sm font-semibold text-foreground">
          Notifications could not be loaded.
        </p>
        <p className="mt-1 text-sm text-muted">
          {list.error instanceof Error
            ? list.error.message
            : 'Check your connection and try again.'}
        </p>
        <Button
          className="mt-4"
          onClick={() => void list.refetch()}
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div
        aria-label="Filter notifications"
        className="mb-5 flex gap-2 overflow-x-auto pb-1"
        role="group"
      >
        {filters.map((option) => (
          <Button
            aria-pressed={filter === option.value}
            className="shrink-0"
            key={option.value}
            onClick={() => setFilter(option.value)}
            size="sm"
            variant={filter === option.value ? 'primary' : 'secondary'}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {list.items.length === 0 ? (
        <NotificationEmpty filterLabel={filterLabel} />
      ) : (
        <div aria-busy={list.isFetchingNextPage} className="grid gap-3">
          {list.items.map((notification) => (
            <NotificationCard
              isDeletePending={isDeletePending}
              isReadPending={isReadPending}
              key={notification.id}
              notification={notification}
              onDelete={onDelete}
              onSetRead={onSetRead}
            />
          ))}
          {list.isFetchingNextPage && <NotificationSkeleton />}
          {list.hasNextPage && (
            <div className="flex justify-center py-3" ref={sentinelRef}>
              <Button
                disabled={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
                variant="outline"
              >
                {list.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
          {list.isFetchNextPageError && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-danger/30 p-4">
              <p className="text-sm text-muted">
                More notifications could not be loaded.
              </p>
              <Button
                onClick={() => void list.fetchNextPage()}
                size="sm"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
