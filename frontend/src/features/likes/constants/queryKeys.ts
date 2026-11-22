export const likeQueryKeys = {
  all: ['likes'] as const,
  video: (videoId: string, userId: string | null) =>
    ['likes', 'video', videoId, userId] as const,
};
