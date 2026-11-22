'use client';

type ChartPoint = {
  day: string;
  views: number;
  impressions: number;
  watchMs: number;
  followers: number;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export default function PerformanceChart({
  title,
  data,
  metric = 'views',
}: {
  title: string;
  data: ChartPoint[];
  metric?: 'views' | 'watchMs' | 'followers';
}) {
  const width = 720;
  const height = 220;
  const padding = 28;
  const values = data.map((point) => point[metric]);
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x =
      data.length <= 1
        ? width / 2
        : padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (value / maximum) * (height - padding * 2);
    return `${x},${y}`;
  });
  const firstDay = data[0]?.day;
  const lastDay = data.at(-1)?.day;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted">
          {firstDay && lastDay
            ? `${dateFormatter.format(new Date(`${firstDay}T00:00:00Z`))} – ${dateFormatter.format(new Date(`${lastDay}T00:00:00Z`))}`
            : 'No activity yet'}
        </span>
      </div>
      <svg
        aria-label={`${title} chart`}
        className="mt-4 h-52 w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (line / 3) * (height - padding * 2);
          return (
            <line
              key={line}
              stroke="currentColor"
              strokeDasharray="3 5"
              strokeOpacity="0.14"
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
            />
          );
        })}
        {points.length > 1 && (
          <polyline
            fill="none"
            points={points.join(' ')}
            stroke="var(--color-primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        )}
        {points.map((point, index) => {
          const [cx, cy] = point.split(',');
          return (
            <circle
              key={`${data[index]?.day}-${index}`}
              cx={cx}
              cy={cy}
              fill="var(--color-primary)"
              r="3.5"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{data[0]?.day ?? '—'}</span>
        <span>{data.at(-1)?.day ?? '—'}</span>
      </div>
      {data.length === 0 && (
        <p className="sr-only">There is no chart data in this date range.</p>
      )}
    </section>
  );
}
