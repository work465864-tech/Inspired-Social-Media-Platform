import { Activity, Clock3, Eye, Repeat2, UsersRound } from 'lucide-react';
import type { CreatorStudioSummary } from '../types';

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

export function EngagementWidget({
  summary,
}: {
  summary: CreatorStudioSummary;
}) {
  const items = [
    {
      label: 'Unique viewers',
      value: compactNumber.format(summary.analytics.uniqueViewers),
      icon: <UsersRound aria-hidden="true" className="h-4 w-4" />,
    },
    {
      label: 'Repeat views',
      value: compactNumber.format(summary.analytics.repeatViews),
      icon: <Repeat2 aria-hidden="true" className="h-4 w-4" />,
    },
    {
      label: 'Average watch',
      value: formatDuration(summary.analytics.averageWatchMs),
      icon: <Clock3 aria-hidden="true" className="h-4 w-4" />,
    },
    {
      label: 'View-through',
      value: `${(summary.analytics.viewThroughRate * 100).toFixed(1)}%`,
      icon: <Eye aria-hidden="true" className="h-4 w-4" />,
    },
    {
      label: 'Avg. session watch',
      value: formatDuration(summary.analytics.averageSessionWatchMs),
      icon: <Activity aria-hidden="true" className="h-4 w-4" />,
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Audience quality
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            className="flex items-center justify-between gap-3 rounded-xl bg-canvas/70 px-3 py-2.5"
            key={item.label}
          >
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <span className="text-primary">{item.icon}</span>
              {item.label}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
