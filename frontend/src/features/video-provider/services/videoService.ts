import { videoPageSize } from '../constants';
import type { VideoRepository } from './videoRepository';
import type { VideoPage } from '../types';

export class VideoService {
  constructor(private readonly repository: VideoRepository) {}

  getFeedPage(page: number, signal: AbortSignal): Promise<VideoPage> {
    return this.repository.getPage(
      { kind: 'feed', page, pageSize: videoPageSize },
      signal,
    );
  }

  getTrendingPage(page: number, signal: AbortSignal): Promise<VideoPage> {
    return this.repository.getPage(
      { kind: 'trending', page, pageSize: videoPageSize },
      signal,
    );
  }

  searchPage(
    query: string,
    page: number,
    signal: AbortSignal,
  ): Promise<VideoPage> {
    return this.repository.getPage(
      { kind: 'search', page, pageSize: videoPageSize, query },
      signal,
    );
  }
}
