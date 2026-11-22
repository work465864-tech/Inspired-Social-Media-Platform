export const notificationQueryKeys = {
  all: ['notifications'] as const,
  lists: (userId: string | null) => ['notifications', 'list', userId] as const,
  list: (userId: string | null, filter: string) =>
    ['notifications', 'list', userId, filter] as const,
  unreadCount: (userId: string | null) =>
    ['notifications', 'unread-count', userId] as const,
  settings: (userId: string | null) =>
    ['notifications', 'settings', userId] as const,
};
