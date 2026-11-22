import { AlertCircle, LoaderCircle, RefreshCw, VideoOff } from 'lucide-react';

export function VideoFeedSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading videos"
      className="relative min-h-[26rem] overflow-hidden rounded-2xl bg-surface-raised sm:rounded-[1.65rem]"
      role="status"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-raised via-slate-400/20 to-primary/10 motion-reduce:animate-none" />
      <div className="absolute bottom-8 left-5 right-20 space-y-3">
        <div className="h-3 w-2/5 animate-pulse rounded-full bg-white/25 motion-reduce:animate-none" />
        <div className="h-5 w-3/5 animate-pulse rounded-full bg-white/25 motion-reduce:animate-none" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-white/20 motion-reduce:animate-none" />
      </div>
      <span className="sr-only">Loading videos</span>
    </div>
  );
}

export function VideoFeedEmpty({ searching = false }: { searching?: boolean }) {
  return (
    <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-surface/70 p-8 text-center">
      <div>
        <VideoOff aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          {searching ? 'No matching videos' : 'No videos found'}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {searching
            ? 'Try another search to discover more videos.'
            : 'There are no videos available right now. Please check back soon.'}
        </p>
      </div>
    </section>
  );
}

export function VideoFeedError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      aria-live="assertive"
      className="grid min-h-72 place-items-center rounded-2xl border border-danger/25 bg-danger/5 p-8 text-center"
      role="alert"
    >
      <div>
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-danger"
        />
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          Videos could not be loaded
        </h2>
        <p className="mt-1 text-sm text-muted">{message}</p>
        <button
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Retry
        </button>
      </div>
    </section>
  );
}

export function VideoFeedLoadingMore() {
  return (
    <div
      aria-label="Loading more videos"
      aria-live="polite"
      className="flex items-center justify-center gap-2 py-4 text-sm text-muted"
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      Loading more videos
    </div>
  );
}
