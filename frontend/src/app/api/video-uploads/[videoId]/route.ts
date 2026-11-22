import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  cancelOwnedDraft,
  createUploadAdminClient,
  requireOwnedDraft,
  requireUploadPermission,
  UploadApiError,
  uploadApiErrorResponse,
} from '../../../../features/upload/services/uploadServerService';

const pathsSchema = z.object({
  original: z.string().min(1),
  compressed: z.string().min(1),
  thumbnail: z.string().min(1),
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
    await cancelOwnedDraft(
      createUploadAdminClient(),
      videoId,
      user.id,
      parsed.data,
    );

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    return uploadApiErrorResponse(error);
  }
}
