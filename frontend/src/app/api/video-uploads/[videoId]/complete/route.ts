import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createUploadAdminClient,
  requireOwnedDraft,
  requireUploadPermission,
  UploadApiError,
  uploadApiErrorResponse,
  validateUploadPaths,
  verifyStoredAsset,
} from '../../../../../features/upload/services/uploadServerService';
import {
  uploadBuckets,
  uploadLimits,
} from '../../../../../features/upload/constants/uploadConfig';
import type {
  UploadAssetDeclaration,
  UploadPaths,
} from '../../../../../features/upload/types/upload';

const assetSchema = z.object({
  bucketId: z.enum([
    uploadBuckets.original,
    uploadBuckets.compressed,
    uploadBuckets.thumbnail,
  ]),
  objectPath: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().positive(),
});

const completeSchema = z.object({
  paths: z.object({
    original: z.string().min(1),
    compressed: z.string().min(1),
    thumbnail: z.string().min(1),
  }),
  assets: z.array(assetSchema).length(3),
  hashtags: z
    .array(
      z
        .string()
        .regex(new RegExp(`^[a-z0-9_]{1,${uploadLimits.maxHashtagLength}}$`)),
    )
    .max(uploadLimits.maxHashtags)
    .refine((hashtags) => new Set(hashtags).size === hashtags.length),
});

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

function assertAssetsMatchPaths(
  assets: UploadAssetDeclaration[],
  paths: UploadPaths,
): void {
  const expected = [
    {
      bucketId: uploadBuckets.original,
      objectPath: paths.original,
      mimeType: paths.original.endsWith('.mov')
        ? 'video/quicktime'
        : paths.original.endsWith('.webm')
          ? 'video/webm'
          : 'video/mp4',
    },
    {
      bucketId: uploadBuckets.compressed,
      objectPath: paths.compressed,
      mimeType: 'video/mp4',
    },
    {
      bucketId: uploadBuckets.thumbnail,
      objectPath: paths.thumbnail,
      mimeType: 'image/jpeg',
    },
  ];

  if (
    expected.some(
      (item) =>
        !assets.some(
          (asset) =>
            asset.bucketId === item.bucketId &&
            asset.objectPath === item.objectPath &&
            asset.mimeType === item.mimeType,
        ),
    )
  ) {
    throw new UploadApiError(
      400,
      'invalid_asset_metadata',
      'Uploaded file metadata does not match the upload.',
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { videoId } = await params;
    if (!z.string().uuid().safeParse(videoId).success) {
      throw new UploadApiError(
        400,
        'invalid_video',
        'The video id is invalid.',
      );
    }

    const body: unknown = await request.json();
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      throw new UploadApiError(
        400,
        'invalid_upload_metadata',
        'The completed upload metadata is invalid.',
      );
    }

    const { supabase, user } = await requireUploadPermission();
    const video = await requireOwnedDraft(videoId, user.id, supabase);
    const paths = parsed.data.paths;
    const assets = parsed.data.assets;
    validateUploadPaths(paths, user.id, videoId);
    assertAssetsMatchPaths(assets, paths);
    const totalVideoBytes = assets
      .filter((asset) => asset.bucketId !== uploadBuckets.thumbnail)
      .some((asset) => asset.byteSize > uploadLimits.maxStoredVideoBytes);
    if (totalVideoBytes) {
      throw new UploadApiError(
        400,
        'file_too_large',
        'A video file exceeds the configured storage limit.',
      );
    }

    const admin = createUploadAdminClient();
    await Promise.all(
      assets.map((asset) => verifyStoredAsset(admin, video.id, user.id, asset)),
    );

    if (parsed.data.hashtags.length > 0) {
      const { data: hashtags, error: hashtagError } = await admin
        .from('hashtags')
        .upsert(
          parsed.data.hashtags.map((slug) => ({ slug })),
          { onConflict: 'slug' },
        )
        .select('id');
      if (hashtagError || !hashtags) {
        throw new UploadApiError(
          502,
          'hashtag_save_failed',
          'Video hashtags could not be saved.',
        );
      }

      const { error: videoHashtagsError } = await admin
        .from('video_hashtags')
        .upsert(
          hashtags.map((hashtag) => ({
            video_id: video.id,
            hashtag_id: hashtag.id,
          })),
          { onConflict: 'video_id,hashtag_id', ignoreDuplicates: true },
        );
      if (videoHashtagsError) {
        throw new UploadApiError(
          502,
          'hashtag_link_failed',
          'Video hashtags could not be linked.',
        );
      }
    }

    const rows = assets.map((asset) => ({
      video_id: video.id,
      asset_type:
        asset.bucketId === uploadBuckets.original
          ? ('original' as const)
          : asset.bucketId === uploadBuckets.compressed
            ? ('compressed' as const)
            : ('thumbnail' as const),
      variant_key: 'default',
      bucket_id: asset.bucketId,
      object_path: asset.objectPath,
      mime_type: asset.mimeType,
      byte_size: asset.byteSize,
      width: null,
      height: null,
      duration_ms: null,
    }));

    const { error: assetsError } = await admin
      .from('video_assets')
      .insert(rows);
    if (assetsError) {
      throw new UploadApiError(
        502,
        'metadata_save_failed',
        'Video asset metadata could not be saved.',
      );
    }

    const { data: updatedVideo, error: videoError } = await admin
      .from('videos')
      .update({
        status: 'ready',
      })
      .eq('id', video.id)
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle();

    if (videoError || !updatedVideo) {
      throw new UploadApiError(
        502,
        'video_finalize_failed',
        'The video could not be finalized.',
      );
    }

    return NextResponse.json({
      videoId: updatedVideo.id,
      status: 'ready',
    });
  } catch (error) {
    return uploadApiErrorResponse(error);
  }
}
