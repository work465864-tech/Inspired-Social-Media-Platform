import { forwardRef, type ImgHTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'src'
> & {
  alt?: string;
  name?: string;
  size?: AvatarSize;
  src?: string | null;
};

const sizes: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[0.625rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export const Avatar = forwardRef<HTMLImageElement, AvatarProps>(function Avatar(
  {
    alt,
    className,
    loading = 'lazy',
    name = 'User',
    size = 'md',
    src,
    ...props
  },
  ref,
) {
  const accessibleName = alt || name;

  return src ? (
    <img
      {...props}
      alt={accessibleName}
      className={cn(
        'shrink-0 rounded-full border border-border bg-surface-raised object-cover',
        sizes[size],
        className,
      )}
      decoding="async"
      loading={loading}
      ref={ref}
      src={src}
    />
  ) : (
    <span
      aria-label={accessibleName}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full border border-border bg-primary/10 font-semibold text-primary',
        sizes[size],
        className,
      )}
      role="img"
    >
      {getInitials(name) || 'U'}
    </span>
  );
});

Avatar.displayName = 'Avatar';
