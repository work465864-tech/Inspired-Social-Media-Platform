'use client';

import { LoaderCircle, Search, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { SearchSuggestion } from '../types';

type SearchInputProps = {
  activeSuggestionIndex: number;
  isLoading: boolean;
  isSuggestionsOpen: boolean;
  listboxId: string;
  onActiveSuggestionChange: (index: number) => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  onSubmit: () => void;
  suggestions: SearchSuggestion[];
  value: string;
};

export function SearchInput({
  activeSuggestionIndex,
  isLoading,
  isSuggestionsOpen,
  listboxId,
  onActiveSuggestionChange,
  onBlur,
  onChange,
  onFocus,
  onSelectSuggestion,
  onSubmit,
  suggestions,
  value,
}: SearchInputProps) {
  const activeSuggestion = suggestions[activeSuggestionIndex];

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      onActiveSuggestionChange(
        activeSuggestionIndex >= suggestions.length - 1
          ? 0
          : activeSuggestionIndex + 1,
      );
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      onActiveSuggestionChange(
        activeSuggestionIndex <= 0
          ? suggestions.length - 1
          : activeSuggestionIndex - 1,
      );
    } else if (event.key === 'Escape') {
      onActiveSuggestionChange(-1);
      event.currentTarget.blur();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (isSuggestionsOpen && activeSuggestion) {
        onSelectSuggestion(activeSuggestion);
      } else {
        onSubmit();
      }
    }
  };

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
      />
      <input
        aria-activedescendant={
          isSuggestionsOpen && activeSuggestionIndex >= 0
            ? `${listboxId}-option-${activeSuggestionIndex}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={isSuggestionsOpen ? listboxId : undefined}
        aria-expanded={isSuggestionsOpen}
        aria-label="Search people, videos, and hashtags"
        autoComplete="off"
        className="h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-24 text-base text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted"
        onChange={(event) => {
          onChange(event.currentTarget.value);
          onActiveSuggestionChange(-1);
        }}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search people, videos, and hashtags"
        role="combobox"
        type="search"
        value={value}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {isLoading && (
          <LoaderCircle
            aria-label="Searching"
            className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none"
            role="status"
          />
        )}
        {value && (
          <button
            aria-label="Clear search"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10"
            onClick={() => onChange('')}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
