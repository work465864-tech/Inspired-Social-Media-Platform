import Link from 'next/link';

export function PublicProfileTabs({
  activeTab,
  isOwner,
  username,
}: {
  activeTab: 'videos' | 'reposts' | 'likes';
  isOwner: boolean;
  username: string;
}) {
  const tabs = [
    { key: 'videos', label: 'Videos', visible: true },
    { key: 'reposts', label: 'Reposts', visible: true },
    { key: 'likes', label: 'Likes', visible: isOwner },
  ] as const;

  return (
    <nav
      aria-label="Creator profile sections"
      className="flex gap-2 overflow-x-auto border-b border-border"
    >
      {tabs
        .filter((tab) => tab.visible)
        .map((tab) => (
          <Link
            aria-current={activeTab === tab.key ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
              activeTab === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted'
            }`}
            href={`/profile/${encodeURIComponent(username)}?tab=${tab.key}`}
            key={tab.key}
          >
            {tab.label}
          </Link>
        ))}
    </nav>
  );
}
