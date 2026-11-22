'use client';

import Link from 'next/link';
import { Bookmark, LoaderCircle, Play, RefreshCw } from 'lucide-react';
import { memo } from 'react';
import { BookmarkButton } from './BookmarkButton';
import { paths } from '../../../constants/paths.js';
import { useBookmarks } from '../hooks/useBookmarks';
import { BookmarkServiceError } from '../services/bookmarkService';

function BookmarkSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-raised motion-reduce:animate-none"
    />
  );
}

const BookmarkCard = memo(function BookmarkCard({
  entry,
}: {
  entry: ReturnType<typeof useBookmarks>['items'][number];
}) {
  const { video } = entry;
  const thumbnail =
    video.assets.find((asset) => asset.type === 'thumbnail')?.signedUrl ?? null;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <Link
        aria-label={`Watch saved video by @${video.profile.username}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
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
            <div className="grid h-full place-items-center bg-gradient-to-br from-primary/20 via-surface-raised to-surface">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface/80 text-primary">
                <Play
                  aria-hidden="true"
                  className="ml-0.5 h-5 w-5 fill-current"
                />
              </span>
            </div>
          )}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/15 to-transparent"
          />
          <div className="absolute inset-x-3 bottom-3 space-y-1.5 text-white">
            <p className="line-clamp-3 text-sm font-semibold leading-5">
              {video.caption || 'Saved video'}
            </p>
          </div>
        </div>
      </Link>
      <Link
        className="block min-h-10 truncate px-3 py-2 text-xs font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href={paths.creatorProfile(video.profile.username)}
      >
        @{video.profile.username}
      </Link>
      <div className="absolute right-2 top-2 rounded-full bg-black/35 p-1 backdrop-blur">
        <BookmarkButton videoId={video.id} />
      </div>
    </article>
  );
});

export function BookmarkGallery() {
  const bookmarks = useBookmarks();
  const errorMessage =
    bookmarks.error instanceof BookmarkServiceError
      ? bookmarks.error.message
      : 'Your saved videos could not be loaded. Please try again.';

  if (bookmarks.isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading saved videos"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        role="status"
      >
        <BookmarkSkeleton />
        <BookmarkSkeleton />
        <BookmarkSkeleton />
        <BookmarkSkeleton />
      </div>
    );
  }

  if (bookmarks.isError && bookmarks.items.length === 0) {
    return (
      <section
        aria-live="assertive"
        className="rounded-2xl border border-danger/25 bg-danger/5 p-6 text-center"
        role="alert"
      >
        <p className="text-sm text-foreground">{errorMessage}</p>
        <button
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => {
            void bookmarks.refetch();
          }}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Retry
        </button>
      </section>
    );
  }

  if (bookmarks.items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-surface/60 px-5 py-12 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Bookmark aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          Your saved videos will be here
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          Bookmark a video to keep it close and come back whenever you like.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div
        aria-label="Saved videos"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        role="list"
      >
        {bookmarks.items.map((entry) => (
          <div key={entry.videoId} role="listitem">
            <BookmarkCard entry={entry} />
          </div>
        ))}
      </div>
      {bookmarks.isError && (
        <p
          aria-live="polite"
          className="text-center text-sm text-danger"
          role="status"
        >
          More saved videos could not be loaded. {errorMessage}
        </p>
      )}
      {bookmarks.hasNextPage && (
        <div className="flex justify-center">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60"
            disabled={bookmarks.isFetchingNextPage}
            onClick={() => {
              void bookmarks.fetchNextPage();
            }}
            type="button"
          >
            {bookmarks.isFetchingNextPage && (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {bookmarks.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
