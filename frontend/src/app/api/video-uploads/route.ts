import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createUploadPaths,
  requireUploadPermission,
  UploadApiError,
  uploadApiErrorResponse,
} from '../../../features/upload/services/uploadServerService';
import { uploadLimits } from '../../../features/upload/constants/uploadConfig';

const draftSchema = z.object({
  title: z.string().trim().min(1).max(uploadLimits.maxTitleLength),
  description: z.string().max(uploadLimits.maxCaptionLength),
  sourceFormat: z.enum(['mp4', 'mov', 'webm', 'm4v']),
  visibility: z.enum(['public', 'followers', 'private']),
  allowComments: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = draftSchema.safeParse(body);
    if (!parsed.success) {
      throw new UploadApiError(
        400,
        'invalid_upload',
        'The upload details are invalid.',
      );
    }

    const { supabase, user } = await requireUploadPermission();
    const { data: video, error } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        caption: parsed.data.description,
        visibility: parsed.data.visibility,
        allow_comments: parsed.data.allowComments,
      })
      .select('id')
      .single();

    if (error || !video) {
      throw new UploadApiError(
        error?.code === '42501' ? 403 : 503,
        error?.code === '42501' ? 'forbidden' : 'draft_create_failed',
        error?.code === '42501'
          ? 'Your account is not permitted to upload videos.'
          : 'An upload draft could not be created.',
      );
    }

    const paths = createUploadPaths(
      user.id,
      video.id,
      parsed.data.sourceFormat,
    );

    return NextResponse.json({ videoId: video.id, paths });
  } catch (error) {
    return uploadApiErrorResponse(error);
  }
}
