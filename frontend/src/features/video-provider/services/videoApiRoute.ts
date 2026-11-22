import { NextResponse, type NextRequest } from 'next/server';
import { VideoProviderError } from '../errors';
import {
  maximumPixabayHits,
  pixabayCacheSeconds,
  videoPageSize,
} from '../constants';
import { getVideoService } from './feedProviderFactory';
import type { VideoRequestKind } from '../types';

const publicCacheControl = `public, max-age=${pixabayCacheSeconds}, s-maxage=${pixabayCacheSeconds}, stale-while-revalidate=3600`;

function parsePage(value: string | null): number {
  if (value === null) {
    return 1;
  }
  const maximumPage = Math.ceil(maximumPixabayHits / videoPageSize);
  if (!/^[1-9]\d{0,2}$/.test(value) || Number(value) > maximumPage) {
    throw new VideoProviderError(
      400,
      'validation',
      'The requested video page is invalid.',
    );
  }
  return Number(value);
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof VideoProviderError) {
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (error.retryAfterSeconds !== null) {
      headers.set('Retry-After', String(error.retryAfterSeconds));
    }

    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers },
    );
  }

  console.error(
    'Unexpected video provider failure:',
    error instanceof Error ? error.name : 'Unknown error',
  );
  return NextResponse.json(
    {
      error: {
        code: 'provider',
        message: 'Video content is temporarily unavailable.',
      },
    },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function handleVideoPageRequest(
  request: NextRequest,
  kind: VideoRequestKind,
): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get('page'));
    const videoService = getVideoService();
    const result =
      kind === 'search'
        ? await videoService.searchPage(
            (url.searchParams.get('q') ?? '').trim(),
            page,
            request.signal,
          )
        : kind === 'trending'
          ? await videoService.getTrendingPage(page, request.signal)
          : await videoService.getFeedPage(page, request.signal);

    return NextResponse.json(result, {
      headers: { 'Cache-Control': publicCacheControl },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    return errorResponse(error);
  }
}
