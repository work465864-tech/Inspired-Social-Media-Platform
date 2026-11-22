export const recommendationQueryKeys = {
  all: ['recommendations'] as const,
  forYou: (userId: string, pageSize: number) =>
    ['recommendations', 'for-you', userId, pageSize] as const,
  score: (userId: string, videoId: string) =>
    ['recommendations', 'score', userId, videoId] as const,
  interestProfile: (userId: string) =>
    ['recommendations', 'interests', userId] as const,
};
