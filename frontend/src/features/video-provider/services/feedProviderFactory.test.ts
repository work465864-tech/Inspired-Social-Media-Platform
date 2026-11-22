import { describe, expect, it, vi } from 'vitest';
import { FeedProviderFactory } from './feedProviderFactory';
import { VideoService } from './videoService';
import type { VideoProvider } from '../providers/videoProvider';

describe('FeedProviderFactory', () => {
  it('creates a service using a registered future provider', () => {
    const provider: VideoProvider = {
      id: 'mux',
      getPage: vi.fn(),
    };
    const factory = new FeedProviderFactory({ mux: () => provider });

    expect(factory.create('mux')).toBeInstanceOf(VideoService);
  });

  it('fails explicitly when a configured provider is not registered', () => {
    const factory = new FeedProviderFactory();

    expect(() => factory.create('cloudflare-stream')).toThrow(
      'The configured video provider is not available.',
    );
  });
});
