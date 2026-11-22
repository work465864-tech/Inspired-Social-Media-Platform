import { Skeleton } from '../../../components/ui/display/Skeleton';
import type { SearchTab } from '../types';

type SearchLoadingProps = {
  tab: SearchTab;
};

export function SearchLoading({ tab }: SearchLoadingProps) {
  return (
    <div
      aria-label={`Loading ${tab} search results`}
      aria-busy="true"
      className="grid gap-3"
      role="status"
    >
      {Array.from({ length: tab === 'videos' ? 4 : 5 }, (_, index) => (
        <div
          className="flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-surface p-4"
          key={index}
        >
          <Skeleton
            className={`shrink-0 ${
              tab === 'videos'
                ? 'h-28 w-20 rounded-xl'
                : 'h-14 w-14 rounded-full'
            }`}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
