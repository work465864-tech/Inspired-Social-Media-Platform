export const bookmarkQueryKeys = {
  all: ['bookmarks'] as const,
  video: (videoId: string, userId: string | null) =>
    ['bookmarks', 'video', videoId, userId] as const,
  list: (userId: string | null) => ['bookmarks', 'list', userId] as const,
};
