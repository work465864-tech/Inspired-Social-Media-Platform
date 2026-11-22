import type { ExploreCategory } from './types';

export const exploreCategories: ExploreCategory[] = [
  { slug: 'all', label: 'For you' },
  { slug: 'dance', label: 'Dance' },
  { slug: 'comedy', label: 'Comedy' },
  { slug: 'food', label: 'Food' },
  { slug: 'pets', label: 'Pets' },
  { slug: 'travel', label: 'Travel' },
  { slug: 'beauty', label: 'Beauty' },
  { slug: 'gaming', label: 'Gaming' },
  { slug: 'diy', label: 'DIY' },
];

export const explorePageSize = 18;
export const exploreVideoTimeoutMs = 15_000;
export const trendingVideoWindowHours = 72;
export const popularVideoWindowDays = 7;
export const trendingCreatorWindowDays = 30;
export const trendingHashtagWindowDays = 14;
export const discoveryVideoSampleSize = 250;
export const trendingSectionLimit = 12;
export const creatorSectionLimit = 10;
export const hashtagSectionLimit = 12;
