import {
  maximumPixabayHits,
  pixabayCacheSeconds,
  pixabayRequestTimeoutMs,
} from '../constants';
import { VideoProviderError } from '../errors';
import type { VideoProvider } from './videoProvider';
import {
  pixabayVideoPageSchema,
  type PixabayFetchOptions,
  type PixabayTransport,
} from './pixabayTypes';
import { videoMapper } from '../services/videoMapper';
import type { VideoPage, VideoPageRequest } from '../types';

const pixabayVideosUrl = new URL('https://pixabay.com/api/videos/');

const defaultTransport: PixabayTransport = {
  fetch: (url: URL, options: PixabayFetchOptions) => fetch(url, options),
};

function toRetryAfterSeconds(response: Response): number | null {
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > 0) {
    return Math.ceil(reset);
  }

  const retryAfter = Number(response.headers.get('retry-after'));
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.ceil(retryAfter)
    : null;
}

export class PixabayProvider implements VideoProvider {
  readonly id = 'pixabay' as const;

  constructor(
    private readonly transport: PixabayTransport = defaultTransport,
  ) {}

  async getPage(
    request: VideoPageRequest,
    signal: AbortSignal,
  ): Promise<VideoPage> {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) {
      throw new VideoProviderError(
        503,
        'configuration',
        'Video content is not configured on the server.',
      );
    }

    const url = new URL(pixabayVideosUrl);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('page', String(request.page));
    url.searchParams.set('per_page', String(request.pageSize));
    url.searchParams.set('safesearch', 'true');
    url.searchParams.set(
      'order',
      request.kind === 'feed' ? 'latest' : 'popular',
    );
    if (request.kind === 'search' && request.query) {
      url.searchParams.set('q', request.query);
    }

    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort(signal.reason);
    if (signal.aborted) {
      abortFromCaller();
    }
    signal.addEventListener('abort', abortFromCaller, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, pixabayRequestTimeoutMs);

    try {
      const response = await this.transport.fetch(url, {
        redirect: 'error',
        signal: controller.signal,
        next: { revalidate: pixabayCacheSeconds },
      });

      if (response.status === 429) {
        throw new VideoProviderError(
          429,
          'rate_limit',
          'Video search is temporarily rate limited. Please try again later.',
          toRetryAfterSeconds(response),
        );
      }
      if (!response.ok) {
        throw new VideoProviderError(
          503,
          'provider',
          'The video provider is temporarily unavailable.',
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new VideoProviderError(
          503,
          'provider',
          'The video provider returned an invalid response.',
        );
      }

      const parsed = pixabayVideoPageSchema.safeParse(payload);
      if (!parsed.success) {
        throw new VideoProviderError(
          503,
          'provider',
          'The video provider returned an invalid response.',
        );
      }

      const items = parsed.data.hits.flatMap((hit) => {
        const video = videoMapper.toVideo(hit);
        return video ? [video] : [];
      });
      const totalHits = Math.min(parsed.data.totalHits, maximumPixabayHits);
      const pageCount = Math.ceil(totalHits / request.pageSize);

      return {
        items,
        totalHits,
        nextPage: request.page < pageCount ? request.page + 1 : null,
      };
    } catch (error) {
      if (error instanceof VideoProviderError) {
        throw error;
      }
      if (signal.aborted) {
        throw error;
      }
      if (timedOut) {
        throw new VideoProviderError(
          504,
          'timeout',
          'The video provider took too long to respond.',
        );
      }
      throw new VideoProviderError(
        503,
        'network',
        'Could not connect to the video provider.',
      );
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abortFromCaller);
    }
  }
}
