import { VideoProviderError } from '../errors';
import { PixabayProvider } from '../providers/pixabayProvider';
import type { VideoProvider } from '../providers/videoProvider';
import type { VideoProviderId } from '../types';
import { VideoService } from './videoService';
import { ProviderVideoRepository } from './videoRepository';

type VideoProviderFactory = () => VideoProvider;
type VideoProviderRegistry = Partial<
  Record<VideoProviderId, VideoProviderFactory>
>;

export class FeedProviderFactory {
  constructor(
    private readonly registry: VideoProviderRegistry = {
      pixabay: () => new PixabayProvider(),
    },
  ) {}

  create(providerId: string): VideoService {
    const factory = Object.entries(this.registry).find(
      ([id]) => id === providerId,
    )?.[1];
    if (!factory) {
      throw new VideoProviderError(
        503,
        'configuration',
        'The configured video provider is not available.',
      );
    }

    return new VideoService(new ProviderVideoRepository(factory()));
  }
}

const feedProviderFactory = new FeedProviderFactory();

export function getVideoService(): VideoService {
  return feedProviderFactory.create(process.env.VIDEO_PROVIDER ?? 'pixabay');
}
