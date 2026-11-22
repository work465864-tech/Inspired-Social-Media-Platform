import type { VideoProviderId } from '../types';
import type { FeedProvider } from './feedProvider';

export interface VideoProvider extends FeedProvider {
  readonly id: VideoProviderId;
}
