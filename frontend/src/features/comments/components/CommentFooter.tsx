import { LoaderCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';

export function CommentFooter({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  if (!hasMore && !isLoading) {
    return null;
  }

  return (
    <footer className="flex justify-center border-t border-border/70 pt-3">
      {isLoading ? (
        <p
          className="inline-flex items-center gap-2 text-sm text-muted"
          role="status"
        >
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
          />
          Loading more comments
        </p>
      ) : (
        <Button onClick={onLoadMore} size="sm" variant="ghost">
          Load more comments
        </Button>
      )}
    </footer>
  );
}
