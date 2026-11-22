import Link from 'next/link';
import { ArrowUpRight, CircleAlert, Clock3, Eye } from 'lucide-react';
import type { CreatorVideo } from '../types';

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function RecentUploads({ videos }: { videos: CreatorVideo[] }) {
  const recent = videos.filter((video) => video.status === 'ready').slice(0, 5);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Recent uploads
        </h2>
        <Link
          className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:underline"
          href="/creator-studio?tab=history"
        >
          View history
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center">
          <Clock3 aria-hidden="true" className="mx-auto h-5 w-5 text-muted" />
          <p className="mt-2 text-sm text-muted">
            Your published videos will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {recent.map((video) => (
            <li
              className="flex items-center justify-between gap-3 py-3"
              key={video.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {video.title || 'Untitled video'}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                  }).format(new Date(video.createdAt))}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                {compactNumber.format(video.views)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {videos.some((video) => video.status === 'hidden') && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <CircleAlert aria-hidden="true" className="h-4 w-4 text-warning" />
          Some videos require moderation review.
        </p>
      )}
    </section>
  );
}
