export function CreatorStudioSkeleton() {
  return (
    <div aria-busy="true" className="space-y-5" role="status">
      <div className="h-24 animate-pulse rounded-3xl bg-surface-raised" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-2xl bg-surface-raised"
            key={index}
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-surface-raised" />
      <span className="sr-only">Loading creator analytics</span>
    </div>
  );
}
