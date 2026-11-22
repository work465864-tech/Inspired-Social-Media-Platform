'use client';

import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react';

export type DialogPlacement =
  'center' | 'drawer-left' | 'drawer-right' | 'bottom';

export type DialogSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  placement?: DialogPlacement;
  closeLabel?: string;
};

const placements: Record<DialogPlacement, string> = {
  center: 'm-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg rounded-card',
  'drawer-left':
    'fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-full max-w-md rounded-none border-y-0 border-l-0',
  'drawer-right':
    'fixed inset-y-0 right-0 m-0 h-dvh max-h-dvh w-full max-w-md rounded-none border-y-0 border-r-0',
  bottom:
    'fixed inset-x-0 bottom-0 m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-card border-x-0 border-b-0',
};

export function DialogSurface({
  children,
  className,
  closeLabel = 'Close dialog',
  description,
  onOpenChange,
  open,
  placement = 'center',
  title,
}: DialogSurfaceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onOpenChange(false);
    }
  }

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`fixed overflow-y-auto border-0 bg-transparent p-0 text-foreground backdrop:bg-black/55 backdrop:backdrop-blur-sm ${placements[placement]} ${className ?? ''}`}
      onCancel={() => onOpenChange(false)}
      onClick={closeFromBackdrop}
      onClose={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <div className="relative max-h-[inherit] overflow-y-auto rounded-[inherit] border border-border bg-surface-raised p-5 shadow-xl sm:p-6">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              className="text-title font-semibold text-foreground"
              id={titleId}
            >
              {title}
            </h2>
            {description && (
              <p
                className="mt-1 text-sm leading-6 text-muted"
                id={descriptionId}
              >
                {description}
              </p>
            )}
          </div>
          <button
            aria-label={closeLabel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
