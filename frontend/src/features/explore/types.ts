import type { Profile, Video } from '../feed/types/models';

export type ExploreCategorySlug =
  | 'all'
  | 'dance'
  | 'comedy'
  | 'food'
  | 'pets'
  | 'travel'
  | 'beauty'
  | 'gaming'
  | 'diy';

export type ExploreCategory = {
  slug: ExploreCategorySlug;
  label: string;
};

export type ExploreVideoSort = 'recent' | 'trending' | 'popular';

export type ExploreVideoCursor = {
  sort: ExploreVideoSort;
  id: string;
  createdAt: string;
  viewsCount: number;
};

export type ExploreVideoPage = {
  items: Video[];
  nextCursor: ExploreVideoCursor | null;
};

export type TrendingCreator = {
  profile: Profile;
  videosCount: number;
  viewsCount: number;
};

export type TrendingHashtag = {
  id: number;
  slug: string;
  videoCount: number;
};

export type ExploreSectionKind =
  | 'trendingVideos'
  | 'trendingCreators'
  | 'trendingHashtags'
  | 'recentlyUploaded'
  | 'popularThisWeek'
  | 'suggestedAccounts'
  | 'trendingMusic'
  | 'trendingSounds'
  | 'trendingCategories'
  | 'trendingChallenges';
