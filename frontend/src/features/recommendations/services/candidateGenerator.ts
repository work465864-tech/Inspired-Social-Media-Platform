import type { Tables } from '../../../types/database.types';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { mediaService } from '../../feed/services/mediaService';
import { normalizeFeedError } from '../../feed/services/errorService';
import { videoService } from '../../feed/services/videoService';
import type { Video } from '../../feed/types/models';
import { exploreCategories } from '../../explore/constants';
import { suggestionService } from '../../explore/services/suggestionService';
import { trendingService } from '../../explore/services/trendingService';
import {
  creatorCandidateLimit,
  followedCreatorLimit,
  followingCandidateLimit,
  randomExplorationLimit,
  recommendationCandidateLimit,
} from '../constants';
import type { RecommendationCandidate, RecommendationSource } from '../types';

type FollowRow = Pick<Tables<'follows'>, 'following_id'>;
type VideoIdRow = Pick<Tables<'videos'>, 'id'>;
type VideoTagRow = {
  video_id: string;
  hashtags: { slug: string } | null;
};

const categorySlugs: Set<string> = new Set(
  exploreCategories
    .map((category) => category.slug)
    .filter((slug) => slug !== 'all'),
);

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function createCandidate(
  video: Video,
  source: RecommendationSource,
  followedCreator: boolean,
): RecommendationCandidate {
  return {
    video,
    sources: [source],
    tags: [],
    categories: [],
    followedCreator,
  };
}

export class CandidateGenerator {
  async generate(
    userId: string,
    signal: AbortSignal,
  ): Promise<RecommendationCandidate[]> {
    try {
      const [freshVideos, trendingVideos, followedIds, suggestedProfiles] =
        await Promise.all([
          videoService
            .getPage(null, recommendationCandidateLimit, signal)
            .then((page) => page.videos),
          trendingService.getTrendingVideos('all', signal),
          this.getFollowedCreatorIds(userId, signal),
          suggestionService.getSuggestedAccounts(userId, signal),
        ]);
      const suggestedIds = suggestedProfiles.map((profile) => profile.id);
      const [followingVideos, creatorVideos] = await Promise.all([
        this.getVideosForCreators(followedIds, followingCandidateLimit, signal),
        this.getVideosForCreators(suggestedIds, creatorCandidateLimit, signal),
      ]);

      const candidateMap = new Map<string, RecommendationCandidate>();
      const followedSet = new Set(followedIds);
      const addVideos = (
        videos: readonly Video[],
        source: RecommendationSource,
      ) => {
        for (const video of videos) {
          const existing = candidateMap.get(video.id);
          if (existing) {
            if (!existing.sources.includes(source)) {
              existing.sources.push(source);
            }
            continue;
          }
          candidateMap.set(
            video.id,
            createCandidate(video, source, followedSet.has(video.userId)),
          );
        }
      };

      addVideos(freshVideos, 'fresh');
      addVideos(followingVideos, 'following');
      addVideos(trendingVideos, 'trending');
      addVideos(creatorVideos, 'recommended_creator');

      const dayKey = new Date().toISOString().slice(0, 10);
      const explorationVideos = [...freshVideos]
        .sort(
          (left, right) =>
            stableHash(`${userId}:${dayKey}:${left.id}`) -
            stableHash(`${userId}:${dayKey}:${right.id}`),
        )
        .slice(0, randomExplorationLimit);
      addVideos(explorationVideos, 'exploration');

      const candidates = [...candidateMap.values()];
      if (candidates.length === 0) {
        return [];
      }

      await this.attachTags(candidates, signal);
      const hydratedVideos = await mediaService.hydrateThumbnails(
        candidates.map((candidate) => candidate.video),
        signal,
      );
      const videosById = new Map(
        hydratedVideos.map((video) => [video.id, video] as const),
      );

      return candidates.flatMap((candidate) => {
        const video = videosById.get(candidate.video.id);
        return video ? [{ ...candidate, video }] : [];
      });
    } catch (error) {
      throw normalizeFeedError(error);
    }
  }

  private async getFollowedCreatorIds(
    userId: string,
    signal: AbortSignal,
  ): Promise<string[]> {
    const { data, error } = await createSupabaseBrowserClient()
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
      .limit(followedCreatorLimit)
      .abortSignal(signal)
      .returns<FollowRow[]>();
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => row.following_id);
  }

  private async getVideosForCreators(
    creatorIds: readonly string[],
    limit: number,
    signal: AbortSignal,
  ): Promise<Video[]> {
    if (creatorIds.length === 0) {
      return [];
    }

    const { data, error } = await createSupabaseBrowserClient()
      .from('videos')
      .select('id')
      .in('user_id', [...creatorIds])
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)
      .abortSignal(signal)
      .returns<VideoIdRow[]>();
    if (error) {
      throw error;
    }

    return videoService.getByIds(
      (data ?? []).map((row) => row.id),
      signal,
    );
  }

  private async attachTags(
    candidates: RecommendationCandidate[],
    signal: AbortSignal,
  ): Promise<void> {
    const { data, error } = await createSupabaseBrowserClient()
      .from('video_hashtags')
      .select('video_id,hashtags!inner(slug)')
      .in(
        'video_id',
        candidates.map((candidate) => candidate.video.id),
      )
      .abortSignal(signal)
      .returns<VideoTagRow[]>();
    if (error) {
      throw error;
    }

    const candidateById = new Map(
      candidates.map((candidate) => [candidate.video.id, candidate] as const),
    );
    for (const row of data ?? []) {
      const candidate = candidateById.get(row.video_id);
      const slug = row.hashtags?.slug;
      if (!candidate || !slug || candidate.tags.includes(slug)) {
        continue;
      }
      candidate.tags.push(slug);
      if (categorySlugs.has(slug)) {
        candidate.categories.push(slug);
      }
    }
  }
}

export const candidateGenerator = new CandidateGenerator();
