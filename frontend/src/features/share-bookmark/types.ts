import type { Video } from '../feed/types/models';

export type BookmarkErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'video_unavailable'
  | 'permission'
  | 'conflict'
  | 'unexpected';

export type BookmarkEntry = {
  videoId: string;
  createdAt: string;
  video: Video;
};

export type BookmarkPage = {
  items: BookmarkEntry[];
  nextOffset: number | null;
};

export type BookmarkPages = {
  pages: BookmarkPage[];
  pageParams: number[];
};
