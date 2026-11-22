'use client';

import { LoaderCircle } from 'lucide-react';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { useBookmark } from '../hooks/useBookmark';
import { BookmarkAnimation } from './BookmarkAnimation';

export const BookmarkButton = memo(function BookmarkButton({
  videoId,
}: {
  videoId: string;
}) {
  const bookmark = useBookmark(videoId);
  const disabled =
    bookmark.isLoading ||
    bookmark.isPending ||
    !bookmark.isAuthenticated ||
    !bookmark.isReady;
  const disabledReason = !bookmark.isAuthenticated
    ? 'Sign in to save videos.'
    : bookmark.isPending
      ? 'Updating bookmark.'
      : !bookmark.isReady
        ? 'Loading bookmark status.'
        : undefined;

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        aria-busy={bookmark.isLoading || bookmark.isPending}
        aria-label={`${bookmark.bookmarked ? 'Remove bookmark' : 'Save video'}${disabledReason ? `. ${disabledReason}` : ''}`}
        aria-pressed={bookmark.bookmarked}
        className="group relative grid min-h-12 min-w-12 place-items-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          void bookmark.toggle().catch((error: unknown) => {
            console.error('Failed to update video bookmark.', error);
          });
        }}
        onPointerUp={(event) => event.stopPropagation()}
        type="button"
        whileTap={disabled ? undefined : { scale: 0.94 }}
      >
        {bookmark.isLoading || bookmark.isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-5 w-5 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <BookmarkAnimation bookmarked={bookmark.bookmarked} />
        )}
      </motion.button>
      {bookmark.error && (
        <span
          aria-live="assertive"
          className="max-w-24 text-center text-[0.625rem] font-medium text-rose-200"
          role="alert"
        >
          {bookmark.error.message}
        </span>
      )}
      {disabledReason && (
        <span aria-live="polite" className="sr-only" role="status">
          {disabledReason}
        </span>
      )}
      {!bookmark.isReady && bookmark.error && (
        <button
          className="min-h-8 rounded px-1 text-[0.625rem] font-semibold text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={(event) => {
            event.stopPropagation();
            bookmark.retry();
          }}
          type="button"
        >
          Retry
        </button>
      )}
    </div>
  );
});
