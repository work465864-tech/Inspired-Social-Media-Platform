export type FeedPost = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  initials: string;
  verified?: boolean;
  timeAgo: string;
  caption: string;
  music: string;
  thumbnailUrl?: string | null;
  likesCount?: number;
  commentsCount?: number;
  likes: string;
  comments: string;
  shares: string;
  bookmarks: string;
  accent: 'violet' | 'teal' | 'coral';
};

export type FeedView = 'For You' | 'Following' | 'Friends' | 'Live';

export type FeedRefreshState = 'idle' | 'refreshing';

export type FeedPage = {
  posts: FeedPost[];
  nextCursor: number | undefined;
  totalCount: number;
};

export type FeedPageRequest = {
  cursor: number;
  limit: number;
  signal: AbortSignal;
};

export type FeedAdapter = {
  getPage: (request: FeedPageRequest) => Promise<FeedPage>;
};

export type FeedVisibilityUpdate = {
  id: string;
  ratio: number;
};

export type FeedScrollPosition = {
  scrollY: number;
  activeItemId: string | null;
};
