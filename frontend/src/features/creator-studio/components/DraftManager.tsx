import { FileVideo2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { CreatorVideo } from '../types';

export function DraftManager({
  videos,
  isLoading,
  onEdit,
  onDelete,
}: {
  videos: CreatorVideo[];
  isLoading: boolean;
  onEdit: (video: CreatorVideo) => void;
  onDelete: (video: CreatorVideo) => void;
}) {
  if (!isLoading && videos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
        <FileVideo2 aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
        <h2 className="mt-3 text-base font-semibold text-foreground">
          No drafts or interrupted uploads
        </h2>
        <p className="mt-1 text-sm text-muted">
          Saved drafts and upload retries will appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-sm text-muted">
        Drafts, processing uploads, and failed uploads.
      </p>
      {isLoading ? (
        <p aria-live="polite" className="py-8 text-center text-sm text-muted">
          Loading drafts…
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {videos.map((video) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-3"
              key={video.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {video.title || 'Untitled video'}
                </p>
                <p className="mt-1 text-xs capitalize text-muted">
                  {video.status} ·{' '}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                  }).format(new Date(video.createdAt))}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onEdit(video)}
                  size="sm"
                  variant="outline"
                >
                  Edit details
                </Button>
                <Button
                  onClick={() => onDelete(video)}
                  size="sm"
                  variant="ghost"
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
