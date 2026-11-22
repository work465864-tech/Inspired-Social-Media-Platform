export type VideoAccent = 'violet' | 'teal' | 'coral';

export type VideoStats = {
  likes: string;
  comments: string;
  shares: string;
  bookmarks: string;
};

export type VideoItem = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  verified?: boolean;
  following?: boolean;
  caption: string;
  music: string;
  location?: string;
  thumbnailUrl?: string | null;
  likesCount?: number;
  commentsCount?: number;
  stats: VideoStats;
  accent?: VideoAccent;
};
