import Skeleton from '../ui/Skeleton.jsx';

export function LoadingScreen() {
  return (
    <section aria-label="Loading page" className="space-y-6" role="status">
      <span className="sr-only">Loading page content</span>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-52 rounded-card" />
        <Skeleton className="h-52 rounded-card" />
      </div>
    </section>
  );
}
