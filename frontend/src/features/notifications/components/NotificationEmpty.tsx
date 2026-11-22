import { Bell } from 'lucide-react';

type NotificationEmptyProps = {
  filterLabel: string;
};

export function NotificationEmpty({ filterLabel }: NotificationEmptyProps) {
  return (
    <div className="grid min-h-64 place-items-center rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Bell aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          You&apos;re all caught up
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
          {filterLabel === 'All'
            ? 'New likes, comments, follows, and updates will appear here.'
            : `There are no ${filterLabel.toLowerCase()} notifications yet.`}
        </p>
      </div>
    </div>
  );
}
