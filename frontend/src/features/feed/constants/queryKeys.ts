export const feedQueryKeys = {
  all: ['feed'] as const,
  infinite: (feedKey: string, pageSize: number) =>
    ['feed', 'infinite', feedKey, pageSize] as const,
  videos: (limit: number) => ['feed', 'videos', 'list', limit] as const,
  video: (videoId: string) => ['feed', 'videos', 'detail', videoId] as const,
  profile: (profileId: string) =>
    ['feed', 'profiles', 'detail', profileId] as const,
};
