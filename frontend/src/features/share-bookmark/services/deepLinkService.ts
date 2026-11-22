const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VideoDeepLinks = {
  canonicalUrl: string;
  appUrl: string;
};

export class DeepLinkService {
  createVideoLinks(videoId: string, origin?: string): VideoDeepLinks {
    if (!uuidPattern.test(videoId)) {
      throw new Error('A valid video ID is required to create a share link.');
    }

    const baseOrigin =
      origin ??
      (typeof window !== 'undefined' ? window.location.origin : undefined);
    if (!baseOrigin) {
      throw new Error('A browser origin is required to create a share link.');
    }

    const path = `/watch/${videoId}`;
    const baseUrl = new URL(baseOrigin);
    const isLoopback =
      baseUrl.hostname === 'localhost' ||
      baseUrl.hostname === '127.0.0.1' ||
      baseUrl.hostname === '[::1]';
    if (baseUrl.protocol !== 'https:' && !isLoopback) {
      throw new Error('Share links must use HTTPS outside localhost.');
    }

    return {
      canonicalUrl: new URL(path, baseUrl).toString(),
      appUrl: `connectly://watch/${videoId}`,
    };
  }
}

export const deepLinkService = new DeepLinkService();
