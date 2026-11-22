import { SearchX } from 'lucide-react';
import type { SearchTab } from '../types';

const labels: Record<SearchTab, string> = {
  top: 'results',
  people: 'people',
  videos: 'videos',
  hashtags: 'hashtags',
};

type SearchEmptyProps = {
  query: string;
  target: SearchTab;
};

export function SearchEmpty({ query, target }: SearchEmptyProps) {
  return (
    <section className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <SearchX aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          No {labels[target]} found
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Try a different spelling or another search term for “{query}”.
        </p>
      </div>
    </section>
  );
}
