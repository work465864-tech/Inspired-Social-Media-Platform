import type { Video } from '../../feed/types/models';

const viewWeight = 0.65;
const engagementWeight = 0.35;

export class TrendingScoreService {
  scoreVideos(videos: readonly Video[]): Map<string, number> {
    const maxViews = Math.max(
      0,
      ...videos.map((video) => video.stats.viewsCount),
    );
    const maxEngagement = Math.max(
      0,
      ...videos.map(
        (video) =>
          video.stats.likesCount +
          video.stats.commentsCount +
          (video.stats.sharesCount ?? 0),
      ),
    );
    const maxLogViews = Math.log1p(maxViews);
    const maxLogEngagement = Math.log1p(maxEngagement);

    return new Map(
      videos.map((video) => {
        const views = Math.log1p(video.stats.viewsCount);
        const engagement = Math.log1p(
          video.stats.likesCount +
            video.stats.commentsCount +
            (video.stats.sharesCount ?? 0),
        );
        const viewScore = maxLogViews === 0 ? 0 : views / maxLogViews;
        const engagementScore =
          maxLogEngagement === 0 ? 0 : engagement / maxLogEngagement;

        return [
          video.id,
          Math.max(
            0,
            Math.min(
              1,
              viewScore * viewWeight + engagementScore * engagementWeight,
            ),
          ),
        ];
      }),
    );
  }
}

export const trendingScoreService = new TrendingScoreService();
