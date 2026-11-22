'use client';

import { useRef, type KeyboardEvent } from 'react';
import type { SearchTab } from '../types';

const tabs: { value: SearchTab; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'people', label: 'People' },
  { value: 'videos', label: 'Videos' },
  { value: 'hashtags', label: 'Hashtags' },
];

type SearchTabsProps = {
  onChange: (tab: SearchTab) => void;
  value: SearchTab;
};

export function SearchTabs({ onChange, value }: SearchTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const direction =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) {
      return;
    }
    event.preventDefault();
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const tab = tabs[nextIndex];
    if (tab) {
      onChange(tab.value);
      refs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      aria-label="Search result type"
      className="flex gap-2 overflow-x-auto border-b border-border pb-2"
      role="tablist"
    >
      {tabs.map((tab, index) => (
        <button
          aria-selected={value === tab.value}
          className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            value === tab.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
          }`}
          id={`search-tab-${tab.value}`}
          key={tab.value}
          onClick={() => onChange(tab.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
          ref={(element) => {
            refs.current[index] = element;
          }}
          role="tab"
          tabIndex={value === tab.value ? 0 : -1}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
