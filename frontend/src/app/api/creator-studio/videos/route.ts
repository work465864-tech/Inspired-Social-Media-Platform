import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  CreatorApiError,
  creatorApiErrorResponse,
  requireCreatorUser,
} from '../../../../features/creator-studio/services/creatorApiService';
import { creatorService } from '../../../../features/creator-studio/services/CreatorService';
import { creatorVideoStatusSchema } from '../../../../features/creator-studio/types';

const sortSchema = z.enum(['newest', 'oldest', 'most-viewed', 'most-liked']);

export async function GET(request: Request) {
  try {
    const { user } = await requireCreatorUser();
    const params = new URL(request.url).searchParams;
    const page = Number(params.get('page') ?? 1);
    const query = params.get('q') ?? '';
    const status = creatorVideoStatusSchema.safeParse(
      params.get('status') ?? 'all',
    );
    const sort = sortSchema.safeParse(params.get('sort') ?? 'newest');
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 5000 ||
      query.length > 120 ||
      !status.success ||
      !sort.success
    ) {
      throw new CreatorApiError(
        400,
        'invalid_video_query',
        'The content filter is invalid.',
      );
    }

    const videos = await creatorService.getVideos(user.id, {
      page,
      query,
      status: status.data,
      sort: sort.data,
    });
    return NextResponse.json(videos);
  } catch (error) {
    return creatorApiErrorResponse(error);
  }
}
