import {
  defaultMediaProviderId,
  defaultSignedUrlExpiresInSeconds,
  mediaProviderIds,
} from './constants';
import { MediaConfigurationError } from './errors';
import type { MediaProviderConfig } from './types';

function parseCdnBaseUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MediaConfigurationError(
      'NEXT_PUBLIC_MEDIA_CDN_URL must be an absolute URL.',
    );
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new MediaConfigurationError(
      'The media CDN URL must use HTTPS outside localhost.',
    );
  }
  return url.toString().replace(/\/$/, '');
}

export function loadMediaConfig(
  environment: Record<string, string | undefined> = process.env,
): MediaProviderConfig {
  const providerId = environment.NEXT_PUBLIC_MEDIA_PROVIDER;
  const id =
    providerId === undefined
      ? defaultMediaProviderId
      : mediaProviderIds.find((provider) => provider === providerId);
  if (!id) {
    throw new MediaConfigurationError(
      `Unsupported media provider "${providerId}".`,
    );
  }

  return {
    id,
    signedUrlExpiresInSeconds: defaultSignedUrlExpiresInSeconds,
    cdnBaseUrl: parseCdnBaseUrl(environment.NEXT_PUBLIC_MEDIA_CDN_URL),
  };
}

export const mediaConfig = loadMediaConfig();
