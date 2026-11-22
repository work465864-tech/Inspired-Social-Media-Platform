import {
  ArrowUpRight,
  Clock3,
  Flame,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Avatar } from '../../../components/ui/display/Avatar';
import { Badge } from '../../../components/ui/display/Badge';
import { paths } from '../../../constants/paths.js';

const suggestedCreators = [
  { name: 'Aria Morgan', handle: 'aria.in.frames', initials: 'AM' },
  { name: 'Jun Park', handle: 'jun.studio', initials: 'JP' },
  { name: 'Samira Cole', handle: 'samirasees', initials: 'SC' },
];

const trendingTopics = [
  { tag: '#slowmornings', posts: '18.2K posts', category: 'Lifestyle' },
  { tag: '#madebyhand', posts: '9,640 posts', category: 'Creative' },
  { tag: '#cityinmotion', posts: '6,310 posts', category: 'Community' },
];

const recentActivity = [
  { title: 'A new week, a new perspective', time: '12 min ago' },
  { title: 'Small rituals worth keeping', time: '34 min ago' },
];

const onlineCreators = [
  { name: 'Maya Chen', initials: 'MC' },
  { name: 'Theo Rivera', initials: 'TR' },
  { name: 'Nina Park', initials: 'NP' },
  { name: 'Aria Morgan', initials: 'AM' },
];

function SidebarCard({
  title,
  icon: Icon,
  children,
  eyebrow,
}: {
  title: string;
  icon: typeof UsersRound;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <section
      aria-labelledby={`feed-sidebar-${title.toLowerCase().replaceAll(' ', '-')}`}
      className="overflow-hidden rounded-[1.5rem] border border-border bg-surface/85 p-4 shadow-sm backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-primary">
              {eyebrow}
            </p>
          )}
          <h2
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
            id={`feed-sidebar-${title.toLowerCase().replaceAll(' ', '-')}`}
          >
            <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
            {title}
          </h2>
        </div>
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-muted/70" />
      </div>
      {children}
    </section>
  );
}

export function SuggestedUsers() {
  return (
    <SidebarCard eyebrow="People to know" icon={UsersRound} title="Suggested">
      <ul className="space-y-4">
        {suggestedCreators.map((creator, index) => (
          <li
            className="flex min-w-0 items-center gap-2.5"
            key={creator.handle}
          >
            <Avatar
              aria-label={creator.name}
              name={creator.name}
              size="sm"
              className={
                index === 1
                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300'
                  : undefined
              }
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {creator.name}
              </p>
              <p className="truncate text-[0.6875rem] text-muted">
                @{creator.handle}
              </p>
            </div>
            <span className="shrink-0 rounded-pill bg-primary/10 px-2 py-1 text-[0.625rem] font-semibold text-primary">
              Follow
            </span>
          </li>
        ))}
      </ul>
      <Link
        className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-border text-xs font-semibold text-muted transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href={paths.explore}
      >
        Discover creators
      </Link>
    </SidebarCard>
  );
}

export function TrendingSidebar() {
  return (
    <SidebarCard eyebrow="The conversation" icon={Flame} title="Trending now">
      <ol className="space-y-1">
        {trendingTopics.map((topic, index) => (
          <li key={topic.tag}>
            <div className="flex items-start gap-3 rounded-xl px-2 py-2.5">
              <span className="mt-0.5 text-[0.6875rem] font-semibold tabular-nums text-muted/70">
                0{index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {topic.tag}
                </p>
                <p className="mt-1 text-[0.6875rem] text-muted">
                  {topic.posts}
                </p>
              </div>
              <Badge className="px-2 py-0.5 text-[0.5625rem]" variant="neutral">
                {topic.category}
              </Badge>
            </div>
          </li>
        ))}
      </ol>
    </SidebarCard>
  );
}

export function ActivitySidebar() {
  return (
    <SidebarCard
      eyebrow="Around Connectly"
      icon={Clock3}
      title="Recent activity"
    >
      <ul className="space-y-4">
        {recentActivity.map((activity) => (
          <li className="flex gap-3" key={activity.title}>
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/70 ring-4 ring-primary/10"
            />
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-medium leading-5 text-foreground">
                {activity.title}
              </p>
              <p className="mt-1 text-[0.6875rem] text-muted">
                {activity.time}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}

export function OnlineUsers() {
  return (
    <SidebarCard eyebrow="Here right now" icon={Sparkles} title="Online">
      <div className="flex items-center justify-between gap-3">
        <div className="flex -space-x-2">
          {onlineCreators.map((creator) => (
            <span className="relative" key={creator.name}>
              <Avatar
                aria-label={`${creator.name} is online`}
                className="border-2 border-surface"
                name={creator.name}
                size="sm"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success"
              />
            </span>
          ))}
        </div>
        <span className="text-[0.6875rem] font-medium text-muted">
          +8 friends
        </span>
      </div>
    </SidebarCard>
  );
}

export function FeedSidebar() {
  return (
    <div className="space-y-4">
      <SuggestedUsers />
      <TrendingSidebar />
      <OnlineUsers />
      <ActivitySidebar />
    </div>
  );
}
