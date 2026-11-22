import 'server-only';

import { createSupabaseServerClient } from '../../../lib/supabase/server';
import type { PublicCreatorProfileData } from '../types';

type PublicProfileRow = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  is_verified: boolean;
  is_private: boolean;
  status: string;
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

export class PublicProfileService {
  async getByUsername(
    username: string,
  ): Promise<PublicCreatorProfileData | null> {
    const supabase = await createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id,username,full_name,avatar_url,bio,is_verified,is_private,status',
      )
      .eq('username', username.toLowerCase())
      .eq('status', 'active')
      .maybeSingle()
      .returns<PublicProfileRow | null>();

    if (profileError) {
      throw new Error('The creator profile could not be loaded.');
    }
    if (!profile) {
      return null;
    }

    const { data: statsRows, error: statsError } = await supabase.rpc(
      'get_public_creator_stats',
      { target_profile_id: profile.id },
    );
    if (statsError) {
      throw new Error('Creator profile statistics could not be loaded.');
    }
    const stats = statsRows?.[0];
    if (!stats) {
      return null;
    }

    const { data: videoRows, error: videosError } = await supabase
      .from('videos')
      .select('id,title,caption,duration_ms,views_count,likes_count,created_at')
      .eq('user_id', profile.id)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(24)
      .returns<PublicVideoRow[]>();

    if (videosError) {
      throw new Error('Creator videos could not be loaded.');
    }

    const videos = videoRows ?? [];
    const { data: assetRows, error: assetsError } =
      videos.length === 0
        ? { data: [] as PublicAssetRow[], error: null }
        : await supabase
            .from('video_assets')
            .select('video_id,bucket_id,object_path')
            .in(
              'video_id',
              videos.map((video) => video.id),
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
      isVerified: profile.is_verified,
      isPrivate: profile.is_private,
      followersCount: stats.followers_count,
      followingCount: stats.following_count,
      videosCount: stats.videos_count,
      likesCount: stats.likes_count,
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
    };
  }
}

export const publicProfileService = new PublicProfileService();
