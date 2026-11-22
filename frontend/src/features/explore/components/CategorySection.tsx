'use client';

import { useId } from 'react';
import { exploreCategories } from '../constants';
import type { ExploreCategorySlug } from '../types';

type CategorySectionProps = {
  value: ExploreCategorySlug;
  onChange: (category: ExploreCategorySlug) => void;
  onPrefetch?: (category: ExploreCategorySlug) => void;
};

export function CategorySection({
  value,
  onChange,
  onPrefetch,
}: CategorySectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Find your vibe
        </p>
        <h2
          className="mt-1 text-lg font-semibold text-foreground"
          id={headingId}
        >
          Browse categories
        </h2>
      </div>
      <div
        aria-label="Filter discovery videos by category"
        className="flex gap-2 overflow-x-auto pb-2"
        role="group"
      >
        {exploreCategories.map((category) => (
          <button
            aria-pressed={value === category.slug}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              value === category.slug
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface text-muted hover:text-foreground'
            }`}
            key={category.slug}
            onClick={() => onChange(category.slug)}
            onMouseEnter={() => onPrefetch?.(category.slug)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>
    </section>
  );
}
