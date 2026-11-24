import 'server-only';

import { createSupabaseServerClient } from '../../../lib/supabase/server';
import type { PublicCreatorProfileData } from '../types';

type PublicProfileRow = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  website_url?: string | null;
  cover_url?: string | null;
  is_verified: boolean;
  is_private: boolean;
  created_at: string;
};

type PublicVideoRow = {
  id: string;
  title: string;
  caption: string;
  duration_ms: number | null;
  views_count: number;
  likes_count: number;
  created_at: string;
};

type PublicAssetRow = {
  video_id: string;
  bucket_id: string;
  object_path: string;
};

type PublicLikeRow = {
  video_id: string;
  created_at: string;
};

export class PublicProfileService {
  private readonly pageSize = 24;

  async getByUsername(
    username: string,
    page = 1,
    section: 'videos' | 'reposts' | 'likes' = 'videos',
  ): Promise<PublicCreatorProfileData | null> {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: viewer },
      error: viewerError,
    } = await supabase.auth.getUser();
    if (viewerError && viewerError.name !== 'AuthSessionMissingError') {
      throw new Error('Your session could not be verified for this profile.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id,username,full_name,avatar_url,bio,is_verified,is_private,created_at',
      )
      .eq('username', username.toLowerCase())
      .maybeSingle()
      .returns<PublicProfileRow | null>();

    if (profileError) {
      throw new Error('The creator profile could not be loaded.');
    }
    if (!profile) {
      return null;
    }

    const isOwner = viewer?.id === profile.id;
    let canViewPrivateProfile = isOwner;
    if (viewer && !isOwner && profile.is_private) {
      const { data: follow, error: followError } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', viewer.id)
        .eq('following_id', profile.id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (followError) {
        throw new Error(
          'Your access to this private profile could not be checked.',
        );
      }
      canViewPrivateProfile = Boolean(follow);
    } else if (!profile.is_private) {
      canViewPrivateProfile = true;
    }

    const { data: statsRows, error: statsError } = await supabase.rpc(
      'get_public_creator_stats',
      { target_profile_id: profile.id },
    );
    if (statsError) {
      console.error('Creator profile statistics RPC failed.', {
        code: statsError.code,
        message: statsError.message,
        details: statsError.details,
        hint: statsError.hint,
      });
      if (statsError.code === 'PGRST202' || statsError.code === '42883') {
        throw new Error(
          'Creator profile statistics are not installed in Supabase. Apply the creator analytics and public-profile migrations, then reload the API schema.',
        );
      }
      throw new Error(
        `Creator profile statistics could not be loaded (${statsError.code}).`,
      );
    }
    const stats = statsRows?.[0];
    if (!stats) {
      return null;
    }
    const requestedPage =
      Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;
    const activeSection = section === 'likes' && !isOwner ? 'videos' : section;
    let currentPage =
      activeSection === 'likes'
        ? requestedPage
        : Math.min(
            requestedPage,
            Math.max(1, Math.ceil(stats.videos_count / this.pageSize)),
          );
    let videos: PublicVideoRow[] = [];
    let hasMoreVideos = false;
    let likedVideos: PublicVideoRow[] = [];
    let hasMoreLikedVideos = false;

    if (activeSection === 'videos') {
      const { data: videoRows, error: videosError } = await supabase
        .from('videos')
        .select(
          'id,title,caption,duration_ms,views_count,likes_count,created_at',
        )
        .eq('user_id', profile.id)
        .eq('status', 'ready')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(
          (currentPage - 1) * this.pageSize,
          (currentPage - 1) * this.pageSize + this.pageSize,
        )
        .returns<PublicVideoRow[]>();

      if (videosError) {
        throw new Error('Creator videos could not be loaded.');
      }

      const rows = videoRows ?? [];
      hasMoreVideos = rows.length > this.pageSize;
      videos = rows.slice(0, this.pageSize);
    }

    if (activeSection === 'likes') {
      const { count: totalLikedVideos, error: countError } = await supabase
        .from('likes')
        .select('video_id', { count: 'exact', head: true })
        .eq('user_id', profile.id);
      if (countError) {
        throw new Error('Your liked videos could not be counted.');
      }
      currentPage = Math.min(
        currentPage,
        Math.max(1, Math.ceil((totalLikedVideos ?? 0) / this.pageSize)),
      );

      const { data: likeRows, error: likesError } = await supabase
        .from('likes')
        .select('video_id,created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .order('video_id', { ascending: false })
        .range(
          (currentPage - 1) * this.pageSize,
          (currentPage - 1) * this.pageSize + this.pageSize,
        )
        .returns<PublicLikeRow[]>();
      if (likesError) {
        throw new Error('Your liked videos could not be loaded.');
      }

      const visibleLikes = likeRows ?? [];
      hasMoreLikedVideos = visibleLikes.length > this.pageSize;
      const likedVideoIds = visibleLikes
        .slice(0, this.pageSize)
        .map((like) => like.video_id);
      if (likedVideoIds.length > 0) {
        const { data: likedVideoRows, error: likedVideosError } = await supabase
          .from('videos')
          .select(
            'id,title,caption,duration_ms,views_count,likes_count,created_at',
          )
          .in('id', likedVideoIds)
          .eq('status', 'ready')
          .is('deleted_at', null)
          .returns<PublicVideoRow[]>();
        if (likedVideosError) {
          throw new Error('Your liked videos could not be loaded.');
        }
        const videosById = new Map(
          (likedVideoRows ?? []).map((video) => [video.id, video]),
        );
        likedVideos = likedVideoIds.flatMap((id) => {
          const video = videosById.get(id);
          return video ? [video] : [];
        });
      }
    }

    const displayedVideos = [...videos, ...likedVideos];
    const { data: assetRows, error: assetsError } =
      displayedVideos.length === 0
        ? { data: [] as PublicAssetRow[], error: null }
        : await supabase
            .from('video_assets')
            .select('video_id,bucket_id,object_path')
            .in(
              'video_id',
              displayedVideos.map((video) => video.id),
            )
            .eq('asset_type', 'thumbnail')
            .eq('variant_key', 'default')
            .returns<PublicAssetRow[]>();

    if (assetsError) {
      throw new Error('Creator video thumbnails could not be loaded.');
    }

    const assetsByVideo = new Map<string, PublicAssetRow>();
    for (const asset of assetRows ?? []) {
      assetsByVideo.set(asset.video_id, asset);
    }
    const signedUrls = new Map<string, string>();
    const assetsByBucket = new Map<string, PublicAssetRow[]>();
    for (const asset of assetsByVideo.values()) {
      const assets = assetsByBucket.get(asset.bucket_id) ?? [];
      assets.push(asset);
      assetsByBucket.set(asset.bucket_id, assets);
    }
    for (const [bucket, assets] of assetsByBucket) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(
          assets.map((asset) => asset.object_path),
          60 * 60,
        );
      if (error) {
        throw new Error('Creator video thumbnails could not be signed.');
      }
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) {
          signedUrls.set(item.path, item.signedUrl);
        }
      }
    }

    return {
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      websiteUrl: profile.website_url ?? null,
      coverImageUrl: profile.cover_url ?? null,
      isVerified: profile.is_verified,
      isPrivate: profile.is_private,
      isOwner,
      canViewPrivateProfile,
      joinedAt: profile.created_at,
      followersCount: stats.followers_count,
      followingCount: stats.following_count,
      videosCount: stats.videos_count,
      likesCount: stats.likes_count,
      viewsCount: stats.views_count,
      page: currentPage,
      hasMoreVideos,
      hasMoreLikedVideos,
      videos: videos.map((video) => {
        const asset = assetsByVideo.get(video.id);
        return {
          id: video.id,
          title: video.title,
          caption: video.caption,
          durationMs: video.duration_ms,
          viewsCount: video.views_count,
          likesCount: video.likes_count,
          createdAt: video.created_at,
          thumbnailUrl: asset
            ? (signedUrls.get(asset.object_path) ?? null)
            : null,
        };
      }),
      likedVideos: likedVideos.map((video) => {
        const asset = assetsByVideo.get(video.id);
        return {
          id: video.id,
          title: video.title,
          caption: video.caption,
          durationMs: video.duration_ms,
          viewsCount: video.views_count,
          likesCount: video.likes_count,
          createdAt: video.created_at,
          thumbnailUrl: asset
            ? (signedUrls.get(asset.object_path) ?? null)
            : null,
        };
      }),
    };
  }
}

export const publicProfileService = new PublicProfileService();
