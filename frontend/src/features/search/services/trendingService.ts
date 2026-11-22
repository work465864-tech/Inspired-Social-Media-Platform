import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { normalizeSearchError } from './searchUtils';
import type { TrendingSearch } from '../types';

type HashtagLinkRow = {
  hashtag_id: number;
  hashtags: { id: number; slug: string } | null;
};
type VideoIdRow = { id: string };

const trendingVideoWindowDays = 14;
const trendingVideoSampleSize = 100;
const trendingResultLimit = 8;

export class TrendingService {
  async getTrendingSearches(signal: AbortSignal): Promise<TrendingSearch[]> {
    try {
      const supabase = createSupabaseBrowserClient();
      const cutoff = new Date(
        Date.now() - trendingVideoWindowDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data: videos, error: videoError } = await supabase
        .from('videos')
        .select('id')
        .eq('status', 'ready')
        .is('deleted_at', null)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(trendingVideoSampleSize)
        .abortSignal(signal)
        .returns<VideoIdRow[]>();
      if (videoError) {
        throw videoError;
      }
      const videoIds = (videos ?? []).map((video) => video.id);
      if (videoIds.length === 0) {
        return [];
      }

      const { data: links, error: hashtagError } = await supabase
        .from('video_hashtags')
        .select('hashtag_id,hashtags!inner(id,slug)')
        .in('video_id', videoIds)
        .abortSignal(signal)
        .returns<HashtagLinkRow[]>();
      if (hashtagError) {
        throw hashtagError;
      }

      const totals = new Map<number, { slug: string; count: number }>();
      for (const link of links ?? []) {
        if (!link.hashtags) {
          continue;
        }
        const current = totals.get(link.hashtag_id);
        totals.set(link.hashtag_id, {
          slug: link.hashtags.slug,
          count: (current?.count ?? 0) + 1,
        });
      }

      return [...totals.entries()]
        .map(([id, value]) => ({
          id: `hashtag:${id}`,
          query: `#${value.slug}`,
          count: value.count,
        }))
        .sort(
          (left, right) =>
            right.count - left.count || left.query.localeCompare(right.query),
        )
        .slice(0, trendingResultLimit);
    } catch (error) {
      throw normalizeSearchError(error);
    }
  }
}

export const trendingService = new TrendingService();
