import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createUploadAdminClient,
  requireOwnedDraft,
  requireUploadPermission,
  UploadApiError,
  uploadApiErrorResponse,
  validateUploadPaths,
} from '../../../../../features/upload/services/uploadServerService';
import { uploadBuckets } from '../../../../../features/upload/constants/uploadConfig';

const pathsSchema = z.object({
  original: z.string().min(1),
  compressed: z.string().min(1),
  thumbnail: z.string().min(1),
});

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

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
    const parsed = pathsSchema.safeParse(body);
    if (!parsed.success) {
      throw new UploadApiError(
        400,
        'invalid_paths',
        'Upload paths are invalid.',
      );
    }

    const { supabase, user } = await requireUploadPermission();
    await requireOwnedDraft(videoId, user.id, supabase);
    const paths = parsed.data;
    validateUploadPaths(paths, user.id, videoId);

    const admin = createUploadAdminClient();
    const [compressed, thumbnail] = await Promise.all([
      admin.storage
        .from(uploadBuckets.compressed)
        .createSignedUploadUrl(paths.compressed, { upsert: true }),
      admin.storage
        .from(uploadBuckets.thumbnail)
        .createSignedUploadUrl(paths.thumbnail, { upsert: true }),
    ]);

    if (compressed.error || thumbnail.error) {
      throw new UploadApiError(
        502,
        'storage_sign_failed',
        'Secure upload links could not be created.',
      );
    }

    return NextResponse.json({
      compressed: {
        path: paths.compressed,
        signedUrl: compressed.data.signedUrl,
      },
      thumbnail: {
        path: paths.thumbnail,
        signedUrl: thumbnail.data.signedUrl,
      },
    });
  } catch (error) {
    return uploadApiErrorResponse(error);
  }
}
