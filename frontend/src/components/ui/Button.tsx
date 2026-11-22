import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:shadow-glow focus-visible:ring-primary',
  secondary:
    'border border-border bg-surface-raised text-foreground hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-primary',
  ghost:
    'text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5 focus-visible:ring-primary',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-primary',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-danger',
  success:
    'bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-sm px-3 py-1.5 text-xs',
  md: 'min-h-11 rounded-control px-4 py-2 text-sm',
  lg: 'min-h-12 rounded-control px-5 py-2.5 text-base',
  icon: 'h-10 min-h-10 w-10 rounded-full p-0',
};

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'size'
> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
        sizes[size],
        variants[variant],
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
