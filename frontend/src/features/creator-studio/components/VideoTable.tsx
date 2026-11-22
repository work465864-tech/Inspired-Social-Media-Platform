'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { CreatorVideo, CreatorVideoStatus } from '../types';

const statuses: CreatorVideoStatus[] = [
  'all',
  'drafts',
  'ready',
  'draft',
  'processing',
  'failed',
  'hidden',
];

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function VideoTable({
  videos,
  page,
  totalPages,
  status,
  sort,
  query,
  isLoading,
  onPageChange,
  onStatusChange,
  onSortChange,
  onQueryChange,
  onEdit,
  onDelete,
}: {
  videos: CreatorVideo[];
  page: number;
  totalPages: number;
  status: CreatorVideoStatus;
  sort: 'newest' | 'oldest' | 'most-viewed' | 'most-liked';
  query: string;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onStatusChange: (status: CreatorVideoStatus) => void;
  onSortChange: (
    sort: 'newest' | 'oldest' | 'most-viewed' | 'most-liked',
  ) => void;
  onQueryChange: (query: string) => void;
  onEdit: (video: CreatorVideo) => void;
  onDelete: (video: CreatorVideo) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sr-only" htmlFor="creator-video-search">
          Search your videos
        </label>
        <input
          className="min-h-11 rounded-xl border border-border bg-canvas px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          id="creator-video-search"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Search videos"
          type="search"
          value={query}
        />
        <label className="sr-only" htmlFor="creator-video-status">
          Filter by status
        </label>
        <select
          className="min-h-11 rounded-xl border border-border bg-canvas px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          id="creator-video-status"
          onChange={(event) =>
            onStatusChange(event.currentTarget.value as CreatorVideoStatus)
          }
          value={status}
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value === 'all'
                ? 'All statuses'
                : value === 'drafts'
                  ? 'Drafts and upload issues'
                  : value}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="creator-video-sort">
          Sort videos
        </label>
        <select
          className="min-h-11 rounded-xl border border-border bg-canvas px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          id="creator-video-sort"
          onChange={(event) =>
            onSortChange(
              event.currentTarget.value as
                'newest' | 'oldest' | 'most-viewed' | 'most-liked',
            )
          }
          value={sort}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most-viewed">Most viewed</option>
          <option value="most-liked">Most liked</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[650px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3 font-semibold">Video</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Views</th>
              <th className="px-3 py-3 font-semibold">Likes</th>
              <th className="px-3 py-3 font-semibold">Visibility</th>
              <th className="px-3 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr className="border-b border-border/70" key={video.id}>
                <td className="max-w-64 px-3 py-3">
                  <p className="truncate font-semibold text-foreground">
                    {video.title || 'Untitled video'}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {video.caption}
                  </p>
                </td>
                <td className="px-3 py-3 capitalize text-muted">
                  {video.status}
                </td>
                <td className="px-3 py-3 text-foreground">
                  {compactNumber.format(video.views)}
                </td>
                <td className="px-3 py-3 text-foreground">
                  {compactNumber.format(video.likes)}
                </td>
                <td className="px-3 py-3 capitalize text-muted">
                  {video.visibility}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      aria-label={`Edit ${video.title || 'video'}`}
                      onClick={() => onEdit(video)}
                      size="icon"
                      variant="ghost"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={`Delete ${video.title || 'video'}`}
                      onClick={() => onDelete(video)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <p aria-live="polite" className="py-8 text-center text-sm text-muted">
            Loading your videos…
          </p>
        )}
        {!isLoading && videos.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No videos match these filters.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Page {page} of {Math.max(1, totalPages)}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            size="sm"
            variant="outline"
          >
            Previous
          </Button>
          <Button
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            size="sm"
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
