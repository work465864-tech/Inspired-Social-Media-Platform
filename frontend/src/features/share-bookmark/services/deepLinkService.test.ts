import { describe, expect, it } from 'vitest';
import { DeepLinkService } from './deepLinkService';

describe('DeepLinkService', () => {
  const service = new DeepLinkService();

  it('creates canonical web and app links for the same video path', () => {
    expect(
      service.createVideoLinks(
        'f2a0aee0-7068-4af0-9c3d-8b5a68bb1f91',
        'https://connectly.example/feed?tab=following',
      ),
    ).toEqual({
      canonicalUrl:
        'https://connectly.example/watch/f2a0aee0-7068-4af0-9c3d-8b5a68bb1f91',
      appUrl: 'connectly://watch/f2a0aee0-7068-4af0-9c3d-8b5a68bb1f91',
    });
  });

  it('rejects invalid IDs and insecure non-local origins', () => {
    expect(() =>
      service.createVideoLinks('not-a-uuid', 'https://example.com'),
    ).toThrow('A valid video ID is required');
    expect(() =>
      service.createVideoLinks(
        'f2a0aee0-7068-4af0-9c3d-8b5a68bb1f91',
        'http://connectly.example',
      ),
    ).toThrow('Share links must use HTTPS');
    expect(
      service.createVideoLinks(
        'f2a0aee0-7068-4af0-9c3d-8b5a68bb1f91',
        'http://127.0.0.1:3000',
      ).canonicalUrl,
    ).toBe('http://127.0.0.1:3000/watch/f2a0aee0-7068-4af0-9c3d-8b5a68bb1f91');
  });
});
