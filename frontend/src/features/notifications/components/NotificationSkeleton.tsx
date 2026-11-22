import { Skeleton } from '../../../components/ui/display/Skeleton';

export function NotificationSkeleton() {
  return (
    <div
      aria-label="Loading notifications"
      className="grid gap-3"
      role="status"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-4"
          key={index}
        >
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
