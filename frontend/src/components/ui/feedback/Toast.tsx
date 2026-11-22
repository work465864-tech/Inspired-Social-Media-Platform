'use client';

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export type ToastProps = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
} as const;

const colors = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function Toast({
  action,
  className,
  description,
  onDismiss,
  title,
  variant = 'info',
}: ToastProps) {
  const Icon = icons[variant];

  return (
    <div
      aria-live={
        variant === 'danger' || variant === 'warning' ? 'assertive' : 'polite'
      }
      className={cn(
        'flex w-full max-w-sm items-start gap-3 rounded-card border border-border bg-surface-raised p-4 shadow-lg',
        className,
      )}
      role={variant === 'danger' ? 'alert' : 'status'}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 h-5 w-5 shrink-0', colors[variant])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onDismiss && (
        <button
          aria-label="Dismiss notification"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
