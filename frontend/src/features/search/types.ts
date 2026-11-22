import type { Profile, Video } from '../feed/types/models';

export type SearchTarget = 'people' | 'videos' | 'hashtags';
export type SearchTab = 'top' | SearchTarget;
export type VideoSearchSort = 'recent' | 'popular';

export type SearchFilters = {
  verifiedOnly: boolean;
  videoSort: VideoSearchSort;
};

export type SearchUser = Pick<
  Profile,
  'id' | 'username' | 'displayName' | 'avatarUrl' | 'isVerified' | 'isPrivate'
> & {
  bio: string;
};

export type SearchHashtag = {
  id: number;
  slug: string;
};

export type SearchResult =
  | { kind: 'user'; user: SearchUser }
  | { kind: 'video'; video: Video }
  | { kind: 'hashtag'; hashtag: SearchHashtag };

export type SearchPageCursor =
  | { target: 'people'; username: string }
  | { target: 'hashtags'; slug: string }
  | {
      target: 'videos';
      sort: 'recent';
      createdAt: string;
      id: string;
    }
  | {
      target: 'videos';
      sort: 'popular';
      viewsCount: number;
      createdAt: string;
      id: string;
    };

export type SearchPage = {
  items: SearchResult[];
  nextCursor: SearchPageCursor | null;
};

export type SearchSuggestion = {
  id: string;
  label: string;
  description: string;
  query: string;
  tab: SearchTab;
  href?: string;
};

export type RecentSearch = {
  id: number;
  query: string;
  searchedAt: string;
};

export type TrendingSearch = {
  id: string;
  query: string;
  count: number;
};

export type SearchErrorCode =
  | 'aborted'
  | 'offline'
  | 'timeout'
  | 'unauthorized'
  | 'validation'
  | 'server'
  | 'unexpected';
