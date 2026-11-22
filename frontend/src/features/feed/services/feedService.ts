import { normalizeFeedError } from './errorService';
import { mediaService } from './mediaService';
import { videoService } from './videoService';
import type { FeedDataPage, FeedCursor, Video } from '../types/models';
import type { FeedPost } from '../types/feed';

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const relativeTime = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

function formatCount(value: number | null): string {
  return value === null ? '—' : compactNumber.format(value);
}

function formatTimeAgo(createdAt: string): string {
  const ageInSeconds = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(createdAt)) / 1000),
  );
  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60 * 60 * 24 * 365, 'year'],
    [60 * 60 * 24 * 30, 'month'],
    [60 * 60 * 24 * 7, 'week'],
    [60 * 60 * 24, 'day'],
    [60 * 60, 'hour'],
    [60, 'minute'],
  ];

  const unit = units.find(([seconds]) => ageInSeconds >= seconds);
  if (!unit) {
    return 'just now';
  }

  return relativeTime.format(-Math.floor(ageInSeconds / unit[0]), unit[1]);
}

function getInitials(displayName: string, username: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return username.slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function createPost(video: Video, thumbnailUrl: string | null): FeedPost {
  const { profile, stats } = video;
  return {
    id: video.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    initials: getInitials(profile.displayName, profile.username),
    verified: profile.isVerified,
    timeAgo: formatTimeAgo(video.createdAt),
    caption: video.caption,
    music: video.music ?? 'Audio information unavailable',
    likesCount: stats.likesCount,
    commentsCount: stats.commentsCount,
    likes: formatCount(stats.likesCount),
    comments: formatCount(stats.commentsCount),
    shares: formatCount(stats.sharesCount),
    bookmarks: formatCount(stats.bookmarksCount),
    accent: 'violet',
    thumbnailUrl,
  };
}

export const feedService = {
  async getPage(
    cursor: FeedCursor | null,
    limit: number,
    signal: AbortSignal,
  ): Promise<FeedDataPage> {
    try {
      const page = await videoService.getPage(cursor, limit, signal);
      const videos = await mediaService.hydrateThumbnails(page.videos, signal);
      const items = videos.map((video) => {
        const thumbnailUrl =
          video.assets.find((asset) => asset.type === 'thumbnail')?.signedUrl ??
          null;

        return {
          video,
          post: createPost(video, thumbnailUrl),
        };
      });

      return {
        items,
        nextCursor: page.nextCursor,
        totalCount: null,
      };
    } catch (error) {
      throw normalizeFeedError(error);
    }
  },
};
