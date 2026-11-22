import type {
  MediaAssetReference,
  MediaProvider,
  MediaProviderConfig,
  MediaUrlOptions,
} from './types';

export class MediaUrlResolver {
  constructor(
    private readonly provider: MediaProvider,
    private readonly config: MediaProviderConfig,
  ) {}

  async getPlaybackUrl(
    asset: MediaAssetReference,
    options: MediaUrlOptions = {},
    signal?: AbortSignal,
  ): Promise<string> {
    const url = await this.provider.getPlaybackUrl(asset, options, signal);
    return this.resolveCdn(url, options);
  }

  async getThumbnailUrl(
    asset: MediaAssetReference,
    options: MediaUrlOptions = {},
    signal?: AbortSignal,
  ): Promise<string> {
    const url = await this.provider.getThumbnailUrl(asset, options, signal);
    return this.resolveCdn(url, options);
  }

  async getThumbnailUrls(
    assets: readonly MediaAssetReference[],
    options: MediaUrlOptions = {},
    signal?: AbortSignal,
  ): Promise<Map<string, string>> {
    const urls = await this.provider.getThumbnailUrls(assets, options, signal);
    return new Map(
      [...urls].map(([path, url]) => [path, this.resolveCdn(url, options)]),
    );
  }

  private resolveCdn(url: string, options: MediaUrlOptions): string {
    if (
      options.access !== 'public' ||
      !options.useCdn ||
      !this.config.cdnBaseUrl
    ) {
      return url;
    }

    const upstreamUrl = new URL(url);
    if (upstreamUrl.search || upstreamUrl.hash) {
      return url;
    }

    const cdnUrl = new URL(this.config.cdnBaseUrl);
    cdnUrl.pathname = [
      cdnUrl.pathname.replace(/\/$/, ''),
      upstreamUrl.pathname.replace(/^\//, ''),
    ]
      .filter(Boolean)
      .join('/');
    return cdnUrl.toString();
  }
}
