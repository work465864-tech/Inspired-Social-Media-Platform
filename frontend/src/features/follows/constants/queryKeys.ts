export const followQueryKeys = {
  all: ['follows'] as const,
  myCounts: (userId: string) => ['follows', 'counts', userId] as const,
  status: (followerId: string, followingId: string) =>
    ['follows', 'status', followerId, followingId] as const,
};
