import {
  videoPageSchema,
  type VideoPage,
  type VideoRequestKind,
} from '../types';
import { VideoProviderError } from '../errors';

function toEndpoint(kind: VideoRequestKind): string {
  if (kind === 'trending') {
    return '/api/videos/trending';
  }
  if (kind === 'search') {
    return '/api/videos/search';
  }
  return '/api/videos';
}

export class VideoApiClient {
  async getPage(
    kind: VideoRequestKind,
    page: number,
    signal: AbortSignal,
    query?: string,
  ): Promise<VideoPage> {
    const url = new URL(toEndpoint(kind), window.location.origin);
    url.searchParams.set('page', String(page));
    if (query) {
      url.searchParams.set('q', query);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal,
      });
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      throw new VideoProviderError(
        0,
        'network',
        'Could not reach the video service. Check your connection and retry.',
      );
    }

    if (response.redirected && new URL(response.url).pathname === '/login') {
      throw new VideoProviderError(
        401,
        'authentication',
        'Your session has expired. Sign in again to load videos.',
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new VideoProviderError(
        response.status,
        'provider',
        'The video service returned an unreadable response.',
      );
    }

    if (!response.ok) {
      const errorBody =
        typeof body === 'object' && body !== null && 'error' in body
          ? body.error
          : null;
      const message =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'message' in errorBody &&
        typeof errorBody.message === 'string'
          ? errorBody.message
          : 'Videos could not be loaded. Please try again.';
      const code =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'code' in errorBody &&
        typeof errorBody.code === 'string'
          ? errorBody.code
          : response.status === 429
            ? 'rate_limit'
            : 'provider';
      const retryAfterHeader = Number(response.headers.get('retry-after'));

      throw new VideoProviderError(
        response.status,
        code === 'rate_limit' ? 'rate_limit' : 'provider',
        message,
        Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader
          : null,
      );
    }

    const parsed = videoPageSchema.safeParse(body);
    if (!parsed.success) {
      throw new VideoProviderError(
        502,
        'provider',
        'The video service returned invalid video data.',
      );
    }
    return parsed.data;
  }
}

export const videoApiClient = new VideoApiClient();
