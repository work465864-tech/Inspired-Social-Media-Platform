export const commentQueryKeys = {
  all: ['comments'] as const,
  video: (videoId: string) => ['comments', 'video', videoId] as const,
  list: (videoId: string) => ['comments', 'video', videoId, 'list'] as const,
  count: (videoId: string) => ['comments', 'video', videoId, 'count'] as const,
  detail: (commentId: string) => ['comments', 'detail', commentId] as const,
};
