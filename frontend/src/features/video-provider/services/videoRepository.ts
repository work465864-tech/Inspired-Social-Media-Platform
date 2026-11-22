import {
  maximumVideoPageSize,
  maximumVideoSearchLength,
  minimumVideoSearchLength,
} from '../constants';
import { VideoProviderError } from '../errors';
import type { VideoProvider } from '../providers/videoProvider';
import type { VideoPage, VideoPageRequest } from '../types';

export interface VideoRepository {
  getPage(request: VideoPageRequest, signal: AbortSignal): Promise<VideoPage>;
}

export class ProviderVideoRepository implements VideoRepository {
  constructor(private readonly provider: VideoProvider) {}

  async getPage(
    request: VideoPageRequest,
    signal: AbortSignal,
  ): Promise<VideoPage> {
    if (
      !Number.isSafeInteger(request.page) ||
      request.page < 1 ||
      !Number.isSafeInteger(request.pageSize) ||
      request.pageSize < 3 ||
      request.pageSize > maximumVideoPageSize
    ) {
      throw new VideoProviderError(
        400,
        'validation',
        'The video page request is invalid.',
      );
    }

    if (request.kind === 'search') {
      const query = request.query?.trim() ?? '';
      if (
        query.length < minimumVideoSearchLength ||
        query.length > maximumVideoSearchLength
      ) {
        throw new VideoProviderError(
          400,
          'validation',
          'Enter a search term between 2 and 100 characters.',
        );
      }
      return this.provider.getPage({ ...request, query }, signal);
    }

    return this.provider.getPage(request, signal);
  }
}
