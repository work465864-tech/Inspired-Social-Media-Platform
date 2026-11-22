import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createUploadAdminClient,
  requireOwnedDraft,
  requireUploadPermission,
  isUploadPathForVideo,
  UploadApiError,
  uploadApiErrorResponse,
} from '../../../../../features/upload/services/uploadServerService';
import { uploadBuckets } from '../../../../../features/upload/constants/uploadConfig';

const assetSchema = z.object({
  assetKind: z.enum(['original', 'compressed', 'thumbnail']),
  bucketId: z.enum([
    uploadBuckets.original,
    uploadBuckets.compressed,
    uploadBuckets.thumbnail,
  ]),
  objectPath: z.string().min(1).max(512),
});

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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
    const parsed = assetSchema.safeParse(body);
    if (!parsed.success) {
      throw new UploadApiError(
        400,
        'invalid_asset',
        'The media asset request is invalid.',
      );
    }

    const { supabase, user } = await requireUploadPermission();
    await requireOwnedDraft(videoId, user.id, supabase);

    const { assetKind, bucketId, objectPath } = parsed.data;
    const expectedBucket =
      assetKind === 'original'
        ? uploadBuckets.original
        : assetKind === 'compressed'
          ? uploadBuckets.compressed
          : uploadBuckets.thumbnail;
    if (
      bucketId !== expectedBucket ||
      !isUploadPathForVideo(objectPath, user.id, videoId, assetKind)
    ) {
      throw new UploadApiError(
        400,
        'invalid_path',
        'The media object path is invalid.',
      );
    }

    const admin = createUploadAdminClient();
    const { error: storageError } = await admin.storage
      .from(bucketId)
      .remove([objectPath]);
    if (storageError) {
      throw new UploadApiError(
        502,
        'storage_cleanup_failed',
        'The media object could not be removed from Storage.',
      );
    }

    const { error: metadataError } = await admin
      .from('video_assets')
      .delete()
      .eq('video_id', videoId)
      .eq('asset_type', assetKind)
      .eq('bucket_id', bucketId)
      .eq('object_path', objectPath);
    if (metadataError) {
      throw new UploadApiError(
        502,
        'asset_cleanup_failed',
        'The media metadata could not be removed.',
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return uploadApiErrorResponse(error);
  }
}
