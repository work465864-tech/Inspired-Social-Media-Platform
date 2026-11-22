import Link from 'next/link';
import { Play, UserRound } from 'lucide-react';
import { memo } from 'react';
import type { Video } from '../../feed/types/models';

type VideoResultCardProps = {
  video: Video;
};

const numberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function VideoResultCardComponent({ video }: VideoResultCardProps) {
  const thumbnail =
    video.assets.find((asset) => asset.type === 'thumbnail')?.signedUrl ?? null;

  return (
    <article className="group flex gap-4 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-primary/30 sm:p-4">
      <Link
        aria-label={`Watch video by @${video.profile.username}`}
        className="relative block h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-32 sm:w-24"
        href={`/watch/${video.id}`}
      >
        {thumbnail ? (
          <img
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            decoding="async"
            loading="lazy"
            src={thumbnail}
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-primary/20 via-surface-raised to-surface text-primary">
            <Play aria-hidden="true" className="h-6 w-6 fill-current" />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1 py-1">
        <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
          <Link
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            href={`/watch/${video.id}`}
          >
            {video.caption.trim() || `Video by @${video.profile.username}`}
          </Link>
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <UserRound aria-hidden="true" className="h-3.5 w-3.5" />@
          {video.profile.username}
        </p>
        <p className="mt-2 text-xs text-muted">
          {numberFormatter.format(video.stats.viewsCount)} views
          <span aria-hidden="true" className="mx-1.5">
            ·
          </span>
          {numberFormatter.format(video.stats.likesCount)} likes
        </p>
      </div>
    </article>
  );
}

export const VideoResultCard = memo(VideoResultCardComponent);
VideoResultCard.displayName = 'VideoResultCard';
