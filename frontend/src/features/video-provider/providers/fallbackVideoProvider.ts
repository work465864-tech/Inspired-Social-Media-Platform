import type { VideoPage, VideoPageRequest } from '../types';
import { videoApiClient } from '../services/videoApiClient';
import type { VideoProvider } from './videoProvider';

export class FallbackVideoProvider implements VideoProvider {
  readonly id = 'pixabay' as const;

  constructor(private readonly apiClient = videoApiClient) {}

  getPage(request: VideoPageRequest, signal: AbortSignal): Promise<VideoPage> {
    return this.apiClient.getPage('feed', request.page, signal);
  }
}

export const fallbackVideoProvider = new FallbackVideoProvider();
