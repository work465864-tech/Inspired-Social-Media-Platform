'use client';

import { Check, CircleAlert, RefreshCw, Sparkles } from 'lucide-react';
import { memo } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';
import type { FeedPost, FeedRefreshState, FeedView } from '../types/feed';
import { VideoCard } from '../../video/components/VideoCard';

const feedViews: FeedView[] = ['For You', 'Following', 'Friends', 'Live'];

export function FeedContainer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      aria-label="Home feed"
      className={cn(
        'mx-auto w-full max-w-2xl space-y-5 sm:space-y-6',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function FeedColumn({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex min-w-0 flex-col gap-5 sm:gap-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function FeedHeader() {
  return (
    <header className="flex items-end justify-between gap-4 px-1">
      <div>
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          Your community, in motion
        </p>
        <h1 className="text-title font-semibold tracking-tight text-foreground sm:text-display">
          Home
        </h1>
        <p className="mt-1.5 hidden text-sm text-muted sm:block">
          A fresh perspective from people you follow.
        </p>
      </div>
      <span className="mb-1 inline-flex shrink-0 items-center gap-2 rounded-pill border border-border bg-surface/80 px-3 py-2 text-xs font-medium text-muted shadow-sm backdrop-blur-xl">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
        UI preview
      </span>
    </header>
  );
}

export function FeedTabs({ selected = 'For You' }: { selected?: FeedView }) {
  return (
    <nav
      aria-label="Feed views"
      className="sticky top-16 z-20 -mx-1 rounded-2xl border border-border/80 bg-canvas/85 p-1.5 shadow-sm backdrop-blur-xl"
    >
      <ul className="grid grid-cols-4 gap-1" role="list">
        {feedViews.map((view) => {
          const isSelected = view === selected;

          return (
            <li className="min-w-0" key={view}>
              <span
                aria-current={isSelected ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors sm:text-sm',
                  isSelected
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted',
                )}
              >
                {view}
                {view === 'Live' && (
                  <span className="rounded-pill bg-danger/10 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-danger">
                    Soon
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function FeedRefresh({ state = 'idle' }: { state?: FeedRefreshState }) {
  const isRefreshing = state === 'refreshing';

  return (
    <div
      aria-live="polite"
      className="flex items-center justify-between gap-3 px-1 text-xs text-muted"
      role="status"
    >
      <span className="inline-flex items-center gap-2">
        {isRefreshing ? (
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
        )}
        {isRefreshing ? 'Refreshing feed…' : 'Community videos'}
      </span>
      <span className="inline-flex items-center gap-1.5">
        {isRefreshing ? 'Refreshing' : 'Supabase'}
      </span>
    </div>
  );
}

export const FeedItem = memo(function FeedItem({
  post,
  index = 0,
}: {
  post: FeedPost;
  index?: number;
}) {
  return (
    <VideoCard
      index={index}
      video={{
        id: post.id,
        username: post.username,
        displayName: post.displayName,
        avatarUrl: post.avatarUrl,
        thumbnailUrl: post.thumbnailUrl,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        caption: post.caption,
        music: post.music,
        following: true,
        verified: post.verified,
        accent: post.accent,
        stats: {
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          bookmarks: post.bookmarks,
        },
      }}
    />
  );
});

export function FeedSkeleton() {
  return (
    <div
      aria-label="Loading feed"
      aria-busy="true"
      className="overflow-hidden rounded-[1.65rem] border border-border bg-surface p-4 shadow-sm sm:p-5"
      role="status"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-raised motion-reduce:animate-none" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-raised motion-reduce:animate-none" />
          <div className="h-2.5 w-1/4 animate-pulse rounded-full bg-surface-raised motion-reduce:animate-none" />
        </div>
      </div>
      <div className="mt-4 aspect-[9/12] animate-pulse rounded-[1.25rem] bg-gradient-to-br from-surface-raised via-surface-raised/70 to-primary/10 motion-reduce:animate-none sm:aspect-[4/5]" />
      <p className="sr-only">Loading feed content</p>
    </div>
  );
}

export function FeedEmpty() {
  return (
    <div className="rounded-[1.65rem] border border-dashed border-border bg-surface/70 px-6 py-12 text-center shadow-sm sm:py-16">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles aria-hidden="true" className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        Your feed is ready to find its rhythm
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
        Follow a few creators and their latest moments will find a place here.
      </p>
    </div>
  );
}

export function FeedError({
  title = 'The feed could not be displayed',
  description = 'Your feed is temporarily unavailable. Please check back soon.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      aria-live="assertive"
      className="rounded-[1.65rem] border border-danger/25 bg-danger/5 px-6 py-10 text-center"
      role="alert"
    >
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-danger/10 text-danger">
        <CircleAlert aria-hidden="true" className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
        {description}
      </p>
      {onRetry && (
        <button
          className="mt-5 min-h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      )}
    </div>
  );
}
