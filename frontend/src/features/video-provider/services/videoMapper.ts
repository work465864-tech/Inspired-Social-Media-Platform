import type {
  PixabayVideoHit,
  PixabayVideoVariant,
} from '../providers/pixabayTypes';
import { videoNormalizer } from './videoNormalizer';
import type { Video } from '../types';

const pixabayAttributionUrl = 'https://pixabay.com/';

function trustedPixabayUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'cdn.pixabay.com'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function pixabayPageUrl(value: string | undefined): string {
  if (!value) {
    return pixabayAttributionUrl;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'pixabay.com'
      ? url.toString()
      : pixabayAttributionUrl;
  } catch {
    return pixabayAttributionUrl;
  }
}

function selectVariant(
  variants: Record<string, PixabayVideoVariant | undefined>,
): PixabayVideoVariant | undefined {
  return (
    [variants.medium, variants.small, variants.tiny, variants.large].find(
      (variant) => variant?.url,
    ) ?? undefined
  );
}

export class VideoMapper {
  toVideo(hit: PixabayVideoHit): Video | null {
    const variant = selectVariant(hit.videos ?? {});
    const playbackUrl = trustedPixabayUrl(variant?.url);
    if (!playbackUrl) {
      return null;
    }

    const tags = (hit.tags ?? '')
      .slice(0, 500)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const title =
      tags.slice(0, 3).join(' · ').slice(0, 160) || 'Featured video';
    const description =
      tags.join(', ').slice(0, 500) || 'A video selected for your feed.';
    const thumbnail = trustedPixabayUrl(variant?.thumbnail);
    const avatarUrl = trustedPixabayUrl(hit.userImageURL);
    const mapped = videoNormalizer.normalize({
      id: String(hit.id),
      title,
      description,
      thumbnail,
      playbackUrl,
      duration: hit.duration ?? 0,
      width: variant?.width ?? 640,
      height: variant?.height ?? 360,
      views: hit.views ?? 0,
      likes: hit.likes ?? 0,
      comments: hit.comments ?? 0,
      shares: 0,
      creator: {
        id: hit.user_id ? String(hit.user_id) : null,
        name: hit.user?.trim().slice(0, 120) || 'Pixabay creator',
        avatarUrl,
      },
      createdAt: null,
      isDemoContent: true,
      attribution: {
        label: 'Pixabay',
        url: pixabayPageUrl(hit.pageURL),
      },
    });

    return mapped;
  }
}

export const videoMapper = new VideoMapper();
