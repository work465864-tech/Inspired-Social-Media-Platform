import Link from 'next/link';
import { ArrowUpRight, Hash } from 'lucide-react';
import { memo } from 'react';
import type { TrendingHashtag } from '../types';

type HashtagCardProps = {
  hashtag: TrendingHashtag;
};

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function HashtagCardComponent({ hashtag }: HashtagCardProps) {
  const href = `/search?q=${encodeURIComponent(`#${hashtag.slug}`)}&tab=hashtags`;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/30">
      <Link
        aria-label={`Search hashtag ${hashtag.slug}`}
        className="flex min-h-14 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href={href}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Hash aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            #{hashtag.slug}
          </span>
          <span className="mt-1 block text-xs text-muted">
            {compactNumber.format(hashtag.videoCount)} recent videos
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted"
        />
      </Link>
    </article>
  );
}

export const HashtagCard = memo(HashtagCardComponent);
HashtagCard.displayName = 'HashtagCard';
