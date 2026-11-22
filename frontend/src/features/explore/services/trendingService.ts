import type { Tables } from '../../../types/database.types';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { normalizeFeedError } from '../../feed/services/errorService';
import {
  creatorSectionLimit,
  discoveryVideoSampleSize,
  hashtagSectionLimit,
  trendingCreatorWindowDays,
  trendingHashtagWindowDays,
  trendingSectionLimit,
} from '../constants';
import type {
  ExploreCategorySlug,
  TrendingCreator,
  TrendingHashtag,
} from '../types';
import { exploreService } from './exploreService';

type CreatorActivityRow = Pick<
  Tables<'videos'>,
  'user_id' | 'views_count' | 'created_at'
> & {
  profile: Pick<
    Tables<'profiles'>,
    | 'id'
    | 'username'
    | 'full_name'
    | 'avatar_url'
    | 'is_verified'
    | 'is_private'
    | 'created_at'
  > | null;
};
type VideoIdRow = Pick<Tables<'videos'>, 'id'>;
type HashtagUsageRow = {
  hashtag_id: number;
  hashtags: { id: number; slug: string } | null;
};

function windowStart(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export class TrendingService {
  async getTrendingVideos(category: ExploreCategorySlug, signal: AbortSignal) {
    return (
      await exploreService.getVideoPage(
        'trending',
        category,
        null,
        signal,
        trendingSectionLimit,
      )
    ).items;
  }

  async getPopularThisWeek(category: ExploreCategorySlug, signal: AbortSignal) {
    return (
      await exploreService.getVideoPage(
        'popular',
        category,
        null,
        signal,
        trendingSectionLimit,
      )
    ).items;
  }

  async getTrendingCreators(signal: AbortSignal): Promise<TrendingCreator[]> {
    try {
      const { data, error } = await createSupabaseBrowserClient()
        .from('videos')
        .select(
          'user_id,views_count,created_at,profile:profiles!videos_user_id_fkey(id,username,full_name,avatar_url,is_verified,is_private,created_at)',
        )
        .eq('status', 'ready')
        .is('deleted_at', null)
        .gte('created_at', windowStart(trendingCreatorWindowDays))
        .order('created_at', { ascending: false })
        .limit(discoveryVideoSampleSize)
        .abortSignal(signal)
        .returns<CreatorActivityRow[]>();
      if (error) {
        throw error;
      }

      const creators = new Map<string, TrendingCreator>();
      for (const row of data ?? []) {
        if (!row.profile || row.profile.is_private) {
          continue;
        }
        const creator = creators.get(row.user_id);
        if (creator) {
          creator.videosCount += 1;
          creator.viewsCount += row.views_count;
        } else {
          creators.set(row.user_id, {
            profile: {
              id: row.profile.id,
              username: row.profile.username,
              displayName: row.profile.full_name.trim() || row.profile.username,
              avatarUrl: row.profile.avatar_url,
              isVerified: row.profile.is_verified,
              isPrivate: row.profile.is_private,
              createdAt: row.profile.created_at,
            },
            videosCount: 1,
            viewsCount: row.views_count,
          });
        }
      }

      return [...creators.values()]
        .sort(
          (left, right) =>
            right.viewsCount - left.viewsCount ||
            right.videosCount - left.videosCount,
        )
        .slice(0, creatorSectionLimit);
    } catch (error) {
      throw normalizeFeedError(error);
    }
  }

  async getTrendingHashtags(signal: AbortSignal): Promise<TrendingHashtag[]> {
    try {
      const cutoff = windowStart(trendingHashtagWindowDays);
      const { data: videos, error: videoError } =
        await createSupabaseBrowserClient()
          .from('videos')
          .select('id')
          .eq('status', 'ready')
          .is('deleted_at', null)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(discoveryVideoSampleSize)
          .abortSignal(signal)
          .returns<VideoIdRow[]>();
      if (videoError) {
        throw videoError;
      }
      const videoIds = (videos ?? []).map((video) => video.id);
      if (videoIds.length === 0) {
        return [];
      }

      const { data: links, error: hashtagError } =
        await createSupabaseBrowserClient()
          .from('video_hashtags')
          .select('hashtag_id,hashtags!inner(id,slug)')
          .in('video_id', videoIds)
          .abortSignal(signal)
          .returns<HashtagUsageRow[]>();
      if (hashtagError) {
        throw hashtagError;
      }

      const counts = new Map<number, TrendingHashtag>();
      for (const link of links ?? []) {
        if (!link.hashtags) {
          continue;
        }
        const current = counts.get(link.hashtag_id);
        counts.set(link.hashtag_id, {
          id: link.hashtags.id,
          slug: link.hashtags.slug,
          videoCount: (current?.videoCount ?? 0) + 1,
        });
      }

      return [...counts.values()]
        .sort(
          (left, right) =>
            right.videoCount - left.videoCount ||
            left.slug.localeCompare(right.slug),
        )
        .slice(0, hashtagSectionLimit);
    } catch (error) {
      throw normalizeFeedError(error);
    }
  }
}

export const trendingService = new TrendingService();
