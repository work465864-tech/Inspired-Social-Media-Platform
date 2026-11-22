'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { VideoCard } from '../../video/components/VideoCard';
import { useVideo } from '../../feed/hooks/useVideo';
import { getFeedErrorMessage } from '../../feed/services/errorService';
import type { Video } from '../../feed/types/models';
import type { VideoItem } from '../../video/types/video';
import { VideoLoading } from '../../video/components/VideoParts';

const numberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function toVideoItem(video: Video): VideoItem {
  return {
    id: video.id,
    username: video.profile.username,
    displayName: video.profile.displayName,
    avatarUrl: video.profile.avatarUrl,
    verified: video.profile.isVerified,
    following: false,
    caption: video.caption,
    music: video.music ?? 'Audio information unavailable',
    thumbnailUrl:
      video.assets.find((asset) => asset.type === 'thumbnail')?.signedUrl ??
      null,
    likesCount: video.stats.likesCount,
    commentsCount: video.stats.commentsCount,
    stats: {
      likes: numberFormatter.format(video.stats.likesCount),
      comments: numberFormatter.format(video.stats.commentsCount),
      shares: '—',
      bookmarks: '—',
    },
  };
}

export function SharedVideoPage({ videoId }: { videoId: string }) {
  const video = useVideo(videoId);

  return (
    <main className="min-h-dvh bg-canvas px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Connectly
        </Link>
        {video.isLoading ? (
          <VideoLoading />
        ) : video.error || !video.data ? (
          <section
            aria-live="assertive"
            className="rounded-2xl border border-border bg-surface p-6 text-center"
            role="alert"
          >
            <h1 className="text-lg font-semibold text-foreground">
              This video is unavailable
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {getFeedErrorMessage(video.error)}
            </p>
            <button
              className="mt-4 min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              onClick={() => {
                void video.refetch();
              }}
              type="button"
            >
              Try again
            </button>
          </section>
        ) : (
          <VideoCard video={toVideoItem(video.data)} />
        )}
      </div>
    </main>
  );
}
