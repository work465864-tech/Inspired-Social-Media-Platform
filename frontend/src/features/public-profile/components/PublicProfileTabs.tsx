import { LockKeyhole } from 'lucide-react';

const tabs = [
  { label: 'Videos', active: true },
  { label: 'Liked', active: false },
  { label: 'Reposts', active: false },
  { label: 'Playlists', active: false },
  { label: 'Saved', active: false },
] as const;

export function PublicProfileTabs() {
  return (
    <nav
      aria-label="Creator profile sections"
      className="flex gap-2 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => (
        <button
          aria-current={tab.active ? 'page' : undefined}
          aria-disabled={!tab.active}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
            tab.active
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted'
          }`}
          disabled={!tab.active}
          key={tab.label}
          type="button"
        >
          {!tab.active && (
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {tab.label}
          {!tab.active && <span className="sr-only">Coming soon</span>}
        </button>
      ))}
    </nav>
  );
}
