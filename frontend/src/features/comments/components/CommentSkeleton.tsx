import { Skeleton } from '../../../components/ui/display/Skeleton';

export function CommentSkeleton() {
  return (
    <div
      aria-label="Loading comments"
      aria-busy="true"
      className="space-y-5"
      role="status"
    >
      {[0, 1, 2, 3].map((item) => (
        <div className="flex gap-3" key={item}>
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Skeleton className="h-3 w-2/5 rounded-full" />
            <Skeleton className="h-3 w-4/5 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
