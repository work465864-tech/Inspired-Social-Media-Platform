type ExploreSkeletonProps = {
  variant?: 'carousel' | 'grid' | 'cards';
  count?: number;
};

export function ExploreSkeleton({
  variant = 'grid',
  count = 4,
}: ExploreSkeletonProps) {
  const isGrid = variant === 'grid';

  return (
    <div
      aria-busy="true"
      aria-label="Loading discovery content"
      className={
        isGrid
          ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
          : 'flex gap-3 overflow-hidden'
      }
      role="status"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          aria-hidden="true"
          className={`animate-pulse rounded-2xl bg-surface-raised motion-reduce:animate-none ${
            variant === 'cards'
              ? 'h-24 min-w-[15rem] flex-1'
              : isGrid
                ? 'aspect-[3/4]'
                : 'aspect-[3/4] min-w-[12rem]'
          }`}
          key={index}
        />
      ))}
    </div>
  );
}
