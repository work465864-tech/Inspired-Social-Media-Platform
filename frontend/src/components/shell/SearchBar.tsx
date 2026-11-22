'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { paths } from '../../constants/paths.js';

export function SearchBar() {
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = formData.get('search');
    if (typeof value !== 'string' || value.trim().length === 0) {
      router.push(paths.search);
      return;
    }

    const params = new URLSearchParams({
      q: value.trim(),
      tab: 'top',
    });
    router.push(`${paths.search}?${params.toString()}`);
  };

  return (
    <form
      aria-label="Search Connectly"
      className="relative w-full max-w-xl"
      onSubmit={handleSubmit}
      role="search"
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
      <label className="sr-only" htmlFor="connectly-global-search">
        Search Connectly
      </label>
      <input
        autoComplete="off"
        className="h-11 w-full rounded-pill border border-border bg-surface/75 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        id="connectly-global-search"
        name="search"
        placeholder="Search people, videos, and hashtags"
        type="search"
      />
    </form>
  );
}
