import type { VideoPage, VideoPageRequest } from '../types';
import { feedResolver } from '../services/feedResolver';
import type { FeedResolver } from '../services/feedResolver';
import type { FeedProvider } from './feedProvider';

export class HybridFeedProvider implements FeedProvider {
  readonly id = 'hybrid';

  constructor(private readonly resolver: FeedResolver = feedResolver) {}

  getPage(request: VideoPageRequest, signal: AbortSignal): Promise<VideoPage> {
    return this.resolver.resolve(request, signal);
  }
}

export const hybridFeedProvider = new HybridFeedProvider();
