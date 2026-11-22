import { Eye } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';
import { Avatar } from '../display/Avatar';

export type VideoCardProps = HTMLAttributes<HTMLElement> & {
  thumbnailSrc: string;
  title: string;
  creator: string;
  views?: string;
  duration?: string;
};

export function VideoCard({
  className,
  creator,
  duration,
  thumbnailSrc,
  title,
  views,
  ...props
}: VideoCardProps) {
  return (
    <article
      className={cn(
        'group min-w-0 overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-primary/35 motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      <div className="relative aspect-[9/14] overflow-hidden bg-surface-raised">
        <img
          alt={title}
          className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
          decoding="async"
          loading="lazy"
          src={thumbnailSrc}
        />
        {duration && (
          <span className="absolute bottom-3 right-3 rounded-sm bg-black/70 px-2 py-1 text-xs font-medium text-white">
            {duration}
          </span>
        )}
      </div>
      <div className="flex items-start gap-3 p-3.5">
        <Avatar aria-label={creator} name={creator} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted">{creator}</p>
        </div>
        {views && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
            <Eye aria-hidden="true" className="h-3.5 w-3.5" />
            {views}
          </span>
        )}
      </div>
    </article>
  );
}
