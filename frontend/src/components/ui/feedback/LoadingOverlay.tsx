import type { ReactNode } from 'react';
import { Spinner } from '../display/Spinner';

export type LoadingOverlayProps = {
  label?: string;
  children?: ReactNode;
  className?: string;
  fullScreen?: boolean;
};

export function LoadingOverlay({
  children,
  className,
  fullScreen = false,
  label = 'Loading',
}: LoadingOverlayProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={`${
        fullScreen ? 'fixed inset-0 z-[var(--z-overlay)]' : 'absolute inset-0'
      } grid place-items-center bg-canvas/75 p-6 text-center backdrop-blur-sm ${className ?? ''}`}
      role="status"
    >
      <div className="grid justify-items-center gap-3">
        <Spinner label={label} />
        {children ?? <span className="text-sm text-muted">{label}</span>}
      </div>
    </div>
  );
}
