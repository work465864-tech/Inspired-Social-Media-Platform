import { CircleAlert } from 'lucide-react';
import Button from '../../../components/ui/Button';

export function CommentError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const message =
    error instanceof Error
      ? error.message
      : 'Comments could not be loaded. Please try again.';

  return (
    <div
      aria-live="assertive"
      className="grid min-h-36 place-items-center rounded-control border border-danger/25 bg-danger/5 px-5 py-6 text-center"
      role="alert"
    >
      <div>
        <CircleAlert
          aria-hidden="true"
          className="mx-auto h-5 w-5 text-danger"
        />
        <p className="mt-2 text-sm text-foreground">{message}</p>
        <Button className="mt-3" onClick={onRetry} size="sm" variant="outline">
          Try again
        </Button>
      </div>
    </div>
  );
}
