import type {
  MediaAssetReference,
  MediaProvider,
  MediaProviderConfig,
  MediaProviderRegistry,
} from './types';
import { MediaConfigurationError } from './errors';
import { SupabaseMediaProvider } from './providers/supabaseMediaProvider';

const defaultProviderRegistry: MediaProviderRegistry = {
  supabase: (config) => new SupabaseMediaProvider(config),
};

export class MediaFactory {
  constructor(
    private readonly providers: MediaProviderRegistry = defaultProviderRegistry,
  ) {}

  create(config: MediaProviderConfig): MediaProvider {
    const createProvider = this.providers[config.id];
    if (!createProvider) {
      throw new MediaConfigurationError(
        `The "${config.id}" media provider is not installed.`,
      );
    }

    const provider = createProvider(config);
    if (provider.id !== config.id) {
      throw new MediaConfigurationError(
        `The "${config.id}" media factory returned a "${provider.id}" provider.`,
      );
    }

    return provider;
  }
}

export type { MediaAssetReference };

export const mediaFactory = new MediaFactory();
