import type { Tables } from '../../../types/database.types';
import type { FeedPost } from './feed';

export type FeedCursor = {
  createdAt: string;
  id: string;
};

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  status?: string;
  createdAt: string;
};

export type MediaAsset = {
  id: string;
  videoId: string;
  type: Tables<'video_assets'>['asset_type'];
  variantKey: string;
  bucketId: string;
  objectPath: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  signedUrl: string | null;
};

export type VideoStats = {
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number | null;
  bookmarksCount: number | null;
};

export type Video = {
  id: string;
  userId: string;
  caption: string;
  visibility: Tables<'videos'>['visibility'];
  status: Tables<'videos'>['status'];
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
  music: string | null;
  profile: Profile;
  assets: MediaAsset[];
  stats: VideoStats;
};

export type FeedItem = {
  video: Video;
  post: FeedPost;
};

export type FeedDataPage = {
  items: FeedItem[];
  nextCursor: FeedCursor | null;
  totalCount: number | null;
};
