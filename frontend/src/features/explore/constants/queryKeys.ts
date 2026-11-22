import type { ExploreCategorySlug } from '../types';

export const exploreQueryKeys = {
  all: ['explore'] as const,
  videos: (category: ExploreCategorySlug, sort: string) =>
    ['explore', 'videos', category, sort] as const,
  creators: ['explore', 'creators'] as const,
  hashtags: ['explore', 'hashtags'] as const,
  suggestions: (userId: string | null) =>
    ['explore', 'suggested-accounts', userId] as const,
};
