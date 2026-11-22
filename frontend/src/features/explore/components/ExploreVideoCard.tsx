import Link from 'next/link';
import { memo } from 'react';
import { Eye, Heart, Play } from 'lucide-react';
import { paths } from '../../../constants/paths.js';
import type { Video } from '../../feed/types/models';

type ExploreVideoCardProps = {
  video: Video;
  rank?: number;
};

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function ExploreVideoCardComponent({ video, rank }: ExploreVideoCardProps) {
  const thumbnail =
    video.assets.find((asset) => asset.type === 'thumbnail')?.signedUrl ?? null;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <Link
        aria-label={`Watch video by @${video.profile.username}${rank ? `, trending number ${rank}` : ''}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        href={`/watch/${video.id}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-surface-raised">
          {thumbnail ? (
            <img
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
              decoding="async"
              loading="lazy"
              src={thumbnail}
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-primary/20 via-surface-raised to-surface text-primary">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface/80">
                <Play
                  aria-hidden="true"
                  className="ml-0.5 h-5 w-5 fill-current"
                />
              </span>
            </div>
          )}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
          />
          {rank && (
            <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
              #{rank}
            </span>
          )}
          <div className="absolute inset-x-3 bottom-3 space-y-2 text-white">
            <p className="line-clamp-2 text-sm font-semibold leading-5">
              {video.caption.trim() || `Video by @${video.profile.username}`}
            </p>
            <div className="flex items-center justify-end gap-2 text-xs text-white/85">
              <span className="inline-flex shrink-0 items-center gap-2.5">
                <span className="inline-flex items-center gap-1">
                  <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                  {compactNumber.format(video.stats.viewsCount)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart aria-hidden="true" className="h-3.5 w-3.5" />
                  {compactNumber.format(video.stats.likesCount)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </Link>
      <Link
        className="block min-h-10 truncate px-3 py-2 text-xs font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href={paths.creatorProfile(video.profile.username)}
      >
        @{video.profile.username}
      </Link>
    </article>
  );
}

export const ExploreVideoCard = memo(ExploreVideoCardComponent);
ExploreVideoCard.displayName = 'ExploreVideoCard';
