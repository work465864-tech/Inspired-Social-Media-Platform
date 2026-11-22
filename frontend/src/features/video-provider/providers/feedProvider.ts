import type { VideoPage, VideoPageRequest } from '../types';

export interface FeedProvider {
  readonly id: string;
  getPage(request: VideoPageRequest, signal: AbortSignal): Promise<VideoPage>;
}
