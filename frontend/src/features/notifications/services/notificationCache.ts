import type { InfiniteData } from '@tanstack/react-query';
import type { Notification, NotificationPage } from '../types';

export type NotificationPages = InfiniteData<NotificationPage, number>;

export function updateCachedNotification(
  pages: NotificationPages | undefined,
  notificationId: string,
  update: (notification: Notification) => Notification,
): NotificationPages | undefined {
  if (!pages) {
    return pages;
  }

  let changed = false;
  const updatedPages = pages.pages.map((page) => {
    let pageChanged = false;
    const items = page.items.map((notification) => {
      if (notification.id !== notificationId) {
        return notification;
      }
      pageChanged = true;
      changed = true;
      return update(notification);
    });
    return pageChanged ? { ...page, items } : page;
  });

  return changed ? { ...pages, pages: updatedPages } : pages;
}

export function removeCachedNotification(
  pages: NotificationPages | undefined,
  notificationId: string,
): NotificationPages | undefined {
  if (!pages) {
    return pages;
  }

  let changed = false;
  const updatedPages = pages.pages.map((page) => {
    const items = page.items.filter((notification) => {
      const keep = notification.id !== notificationId;
      if (!keep) {
        changed = true;
      }
      return keep;
    });
    return items.length === page.items.length ? page : { ...page, items };
  });

  return changed ? { ...pages, pages: updatedPages } : pages;
}

export function updateCachedNotifications(
  pages: NotificationPages | undefined,
  update: (notification: Notification) => Notification,
): NotificationPages | undefined {
  if (!pages) {
    return pages;
  }

  let changed = false;
  const updatedPages = pages.pages.map((page) => {
    let pageChanged = false;
    const items = page.items.map((notification) => {
      const updated = update(notification);
      if (updated !== notification) {
        pageChanged = true;
        changed = true;
      }
      return updated;
    });
    return pageChanged ? { ...page, items } : page;
  });

  return changed ? { ...pages, pages: updatedPages } : pages;
}
