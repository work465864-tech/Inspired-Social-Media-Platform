import type { Tables } from '../../../types/database.types';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { videoService as databaseVideoService } from '../../feed/services/videoService';
import type { Video as DatabaseVideo } from '../../feed/types/models';
import { exploreService } from '../../explore/services/exploreService';
import { recommendationService } from '../../recommendations/services/recommendationService';
import { mediaService } from '../../media/mediaService';
import type { MediaAssetReference } from '../../media/types';
import { VideoProviderError } from '../errors';
import type { VideoPage, VideoPageRequest, Video } from '../types';
import type { FeedProvider } from './feedProvider';
import {
  feedPriorityEngine,
  type DatabaseFeedSources,
  type FeedPriorityEngine,
} from '../services/feedPriorityEngine';

const databaseVideoLimit = 50;
const trendingVideoLimit = 12;
const followingVideoLimit = 24;
const recommendationVideoLimit = 30;
const pageSizeMaximum = 30;

type VideoIdRow = Pick<Tables<'videos'>, 'id'>;
type FollowRow = Pick<Tables<'follows'>, 'following_id'>;

export type DatabaseCandidateProvider = FeedProvider & {
  getCurrentUserId(signal: AbortSignal): Promise<string | null>;
  getCandidates(
    userId: string | null,
    signal: AbortSignal,
  ): Promise<DatabaseCandidateResult>;
};

export type DatabaseCandidateResult = {
  videos: Video[];
  unavailableSources: string[];
};

function assertPageRequest(request: VideoPageRequest): void {
  if (
    !Number.isSafeInteger(request.page) ||
    request.page < 1 ||
    !Number.isSafeInteger(request.pageSize) ||
    request.pageSize < 1 ||
    request.pageSize > pageSizeMaximum
  ) {
    throw new VideoProviderError(
      400,
      'validation',
      'The hybrid feed page request is invalid.',
    );
  }
}

function orderedByIds(videos: DatabaseVideo[], ids: string[]): DatabaseVideo[] {
  const videosById = new Map(videos.map((video) => [video.id, video] as const));
  return ids.flatMap((id) => {
    const video = videosById.get(id);
    return video ? [video] : [];
  });
}

function toMediaAssetReference(
  video: DatabaseVideo,
  asset: DatabaseVideo['assets'][number],
): MediaAssetReference {
  return {
    videoId: video.id,
    bucketId: asset.bucketId,
    objectPath: asset.objectPath,
    type: asset.type,
  };
}

export class DatabaseVideoProvider implements DatabaseCandidateProvider {
  readonly id = 'supabase' as const;

  constructor(
    private readonly priorityEngine: FeedPriorityEngine = feedPriorityEngine,
  ) {}

  async getCurrentUserId(signal: AbortSignal): Promise<string | null> {
    if (signal.aborted) {
      throw signal.reason ?? new Error('The feed request was cancelled.');
    }
    const { data, error } =
      await createSupabaseBrowserClient().auth.getSession();
    if (error) {
      throw error;
    }
    return data.session?.user.id ?? null;
  }

  async getPage(
    request: VideoPageRequest,
    signal: AbortSignal,
  ): Promise<VideoPage> {
    assertPageRequest(request);
    const userId = await this.getCurrentUserId(signal);
    const { videos: candidates } = await this.getCandidates(userId, signal);
    const start = (request.page - 1) * request.pageSize;
    const items = candidates.slice(start, start + request.pageSize);

    return {
      items,
      nextPage:
        start + request.pageSize < candidates.length ? request.page + 1 : null,
      totalHits: candidates.length,
    };
  }

  async getCandidates(
    userId: string | null,
    signal: AbortSignal,
  ): Promise<DatabaseCandidateResult> {
    const sources: Partial<DatabaseFeedSources> = {};
    const tasks: Array<{
      name: keyof DatabaseFeedSources;
      request: Promise<DatabaseVideo[]>;
    }> = [
      {
        name: 'uploads',
        request: databaseVideoService
          .getPage(null, databaseVideoLimit, signal)
          .then((page) => page.videos),
      },
      {
        name: 'trending',
        request: exploreService
          .getVideoPage('trending', 'all', null, signal, trendingVideoLimit)
          .then((page) => page.items),
      },
    ];

    if (userId) {
      tasks.push(
        {
          name: 'following',
          request: this.getFollowingVideos(userId, signal),
        },
        {
          name: 'recommended',
          request: recommendationService
            .getPage(userId, null, signal, recommendationVideoLimit)
            .then((page) => page.items.map((item) => item.video)),
        },
      );
    }

    const results = await Promise.allSettled(tasks.map((task) => task.request));
    const unavailableSources: string[] = [];
    results.forEach((result, index) => {
      const task = tasks[index];
      if (!task) {
        return;
      }
      if (result.status === 'fulfilled') {
        sources[task.name] = result.value;
      } else {
        unavailableSources.push(task.name);
        console.warn(
          `Hybrid feed ${task.name} source failed:`,
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown source error',
        );
      }
    });

    const ordered = this.priorityEngine.order({
      uploads: sources.uploads ?? [],
      trending: sources.trending ?? [],
      following: sources.following ?? [],
      recommended: sources.recommended ?? [],
    });
    if (signal.aborted) {
      throw signal.reason ?? new Error('The feed request was cancelled.');
    }
    return {
      videos: await this.toProviderVideos(ordered, signal),
      unavailableSources,
    };
  }

  private async getFollowingVideos(
    userId: string,
    signal: AbortSignal,
  ): Promise<DatabaseVideo[]> {
    const supabase = createSupabaseBrowserClient();
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
      .limit(100)
      .abortSignal(signal)
      .returns<FollowRow[]>();
    if (followsError) {
      throw followsError;
    }

    const creatorIds = (follows ?? []).map((follow) => follow.following_id);
    if (creatorIds.length === 0) {
      return [];
    }

    const { data: videoRows, error: videosError } = await supabase
      .from('videos')
      .select('id')
      .in('user_id', creatorIds)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(followingVideoLimit)
      .abortSignal(signal)
      .returns<VideoIdRow[]>();
    if (videosError) {
      throw videosError;
    }

    const ids = (videoRows ?? []).map((row) => row.id);
    return orderedByIds(await databaseVideoService.getByIds(ids, signal), ids);
  }

  private async toProviderVideos(
    videos: DatabaseVideo[],
    signal: AbortSignal,
  ): Promise<Video[]> {
    const thumbnailAssets = videos.flatMap((video) =>
      video.assets
        .filter((asset) => asset.type === 'thumbnail')
        .map((asset) => toMediaAssetReference(video, asset)),
    );
    let thumbnailUrls = new Map<string, string>();
    if (thumbnailAssets.length > 0) {
      try {
        thumbnailUrls = await mediaService.getThumbnailUrls(
          thumbnailAssets,
          { access: 'signed' },
          signal,
        );
      } catch (error) {
        console.warn(
          'Hybrid feed thumbnail URLs could not be signed:',
          error instanceof Error ? error.message : 'Unknown media error',
        );
      }
    }

    const mapped = await Promise.allSettled(
      videos.map(async (video): Promise<Video> => {
        const playbackAsset =
          video.assets.find((asset) => asset.type === 'compressed') ??
          video.assets.find((asset) => asset.type === 'original');
        const thumbnailAsset =
          video.assets.find(
            (asset) =>
              asset.type === 'thumbnail' && asset.variantKey === 'thumbnail',
          ) ?? video.assets.find((asset) => asset.type === 'thumbnail');
        const width =
          playbackAsset?.width ??
          video.assets.find((asset) => asset.width !== null)?.width;
        const height =
          playbackAsset?.height ??
          video.assets.find((asset) => asset.height !== null)?.height;

        if (!playbackAsset || !width || !height) {
          throw new Error('The database video is missing playable media.');
        }

        const playbackUrl = await mediaService.getPlaybackUrl(
          toMediaAssetReference(video, playbackAsset),
          { access: 'signed' },
          signal,
        );
        const title =
          video.caption.trim().slice(0, 160) ||
          `Video by ${video.profile.displayName}`;
        const attributionUrl =
          typeof window === 'undefined'
            ? playbackUrl
            : new URL(
                `/watch/${encodeURIComponent(video.id)}`,
                window.location.origin,
              ).toString();

        return {
          id: video.id,
          title,
          description: video.caption.slice(0, 500),
          thumbnail: thumbnailAsset
            ? (thumbnailUrls.get(thumbnailAsset.objectPath) ?? null)
            : null,
          playbackUrl,
          duration: Math.max(0, (video.durationMs ?? 0) / 1_000),
          width,
          height,
          views: video.stats.viewsCount,
          likes: video.stats.likesCount,
          comments: video.stats.commentsCount,
          shares: video.stats.sharesCount ?? 0,
          creator: {
            id: video.profile.id,
            username: video.profile.username,
            name: video.profile.displayName,
            avatarUrl: video.profile.avatarUrl,
          },
          createdAt: video.createdAt,
          isDemoContent: false,
          attribution: { label: 'Connectly', url: attributionUrl },
        };
      }),
    );

    const providerVideos = mapped.flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        return [result.value];
      }
      const video = videos[index];
      console.warn(
        `Hybrid feed skipped video ${video?.id ?? 'unknown'}:`,
        result.reason instanceof Error
          ? result.reason.message
          : 'Unknown media error',
      );
      return [];
    });

    if (videos.length > 0 && providerVideos.length === 0) {
      throw new AggregateError(
        mapped.flatMap((result) =>
          result.status === 'rejected' ? [result.reason] : [],
        ),
        'Database videos could not be prepared for playback.',
      );
    }
    return providerVideos;
  }
}

export const databaseVideoProvider = new DatabaseVideoProvider();
