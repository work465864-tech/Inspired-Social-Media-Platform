import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  CreatorApiError,
  creatorApiErrorResponse,
  requireCreatorUser,
} from '../../../../../features/creator-studio/services/creatorApiService';
import { creatorService } from '../../../../../features/creator-studio/services/CreatorService';
import { creatorVideoEditorSchema } from '../../../../../features/creator-studio/types';

const paramsSchema = z.object({ videoId: z.string().uuid() });

type VideoRouteContext = {
  params: Promise<{ videoId: string }>;
};

async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new CreatorApiError(
      400,
      'invalid_json',
      'The video update is invalid.',
    );
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new CreatorApiError(
          413,
          'payload_too_large',
          'The video update is too large.',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new CreatorApiError(
      400,
      'invalid_json',
      'The video update is invalid.',
    );
  }
}

async function getVideoId(context: VideoRouteContext): Promise<string> {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    throw new CreatorApiError(
      400,
      'invalid_video_id',
      'The video identifier is invalid.',
    );
  }
  return params.data.videoId;
}

export async function PATCH(request: Request, context: VideoRouteContext) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 32 * 1024) {
      throw new CreatorApiError(
        413,
        'payload_too_large',
        'The video update is too large.',
      );
    }
    if (!request.headers.get('content-type')?.includes('application/json')) {
      throw new CreatorApiError(
        415,
        'unsupported_media_type',
        'The video update must be JSON.',
      );
    }
    const { supabase } = await requireCreatorUser();
    const videoId = await getVideoId(context);
    const input = creatorVideoEditorSchema.safeParse(
      await readJsonBody(request, 32 * 1024),
    );
    if (!input.success) {
      throw new CreatorApiError(
        400,
        'invalid_video_metadata',
        'Review the title, caption, visibility, and hashtags.',
      );
    }
    await creatorService.updateVideo(supabase, videoId, input.data);
    return NextResponse.json({ updated: true });
  } catch (error) {
    return creatorApiErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: VideoRouteContext) {
  try {
    const { supabase } = await requireCreatorUser();
    const videoId = await getVideoId(context);
    await creatorService.deleteVideo(supabase, videoId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return creatorApiErrorResponse(error);
  }
}
