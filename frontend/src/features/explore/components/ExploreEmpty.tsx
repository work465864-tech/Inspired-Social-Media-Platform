import { Compass } from 'lucide-react';

type ExploreEmptyProps = {
  title?: string;
  description?: string;
};

export function ExploreEmpty({
  title = 'Nothing to discover yet',
  description = 'When creators share videos, they will show up here.',
}: ExploreEmptyProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-5 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Compass aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
        {description}
      </p>
    </div>
  );
}
