import { RefreshCw } from 'lucide-react';
import { getSearchErrorMessage } from '../services/searchUtils';

type SearchErrorProps = {
  error: unknown;
  onRetry: () => void;
};

export function SearchError({ error, onRetry }: SearchErrorProps) {
  return (
    <section
      aria-live="assertive"
      className="rounded-2xl border border-danger/25 bg-danger/5 p-6 text-center"
      role="alert"
    >
      <p className="text-sm text-foreground">{getSearchErrorMessage(error)}</p>
      <button
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        Retry search
      </button>
    </section>
  );
}
