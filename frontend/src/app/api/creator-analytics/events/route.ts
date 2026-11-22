import { NextResponse } from 'next/server';
import {
  CreatorApiError,
  creatorApiErrorResponse,
} from '../../../../features/creator-studio/services/creatorApiService';
import { analyticsIngestionService } from '../../../../features/creator-analytics/services/AnalyticsIngestionService';

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    return NextResponse.json(
      { code: 'payload_too_large', error: 'The analytics batch is too large.' },
      { status: 413 },
    );
  }

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 64 * 1024) {
      return NextResponse.json(
        {
          code: 'payload_too_large',
          error: 'The analytics batch is too large.',
        },
        { status: 413 },
      );
    }
    const payload: unknown = JSON.parse(body);
    const accepted = await analyticsIngestionService.ingest(payload);
    return NextResponse.json({ accepted });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { code: 'invalid_json', error: 'The analytics request is invalid.' },
        { status: 400 },
      );
    }
    if (error instanceof CreatorApiError) {
      return creatorApiErrorResponse(error);
    }
    return creatorApiErrorResponse(error);
  }
}
