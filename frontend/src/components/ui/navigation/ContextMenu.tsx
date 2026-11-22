'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../../lib/utils';

export type ContextMenuProps = {
  children: ReactNode;
  menu: ReactNode;
  label: string;
  className?: string;
};

type MenuPosition = {
  left: number;
  top: number;
};

export function ContextMenu({
  children,
  className,
  label,
  menu,
}: ContextMenuProps) {
  const [position, setPosition] = useState<MenuPosition>({ left: 0, top: 0 });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const positionMenu = useCallback((x: number, y: number) => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const bounds = root.getBoundingClientRect();
    setPosition({
      left: Math.max(0, Math.min(x - bounds.left, bounds.width - 192)),
      top: Math.max(0, Math.min(y - bounds.top, bounds.height - 120)),
    });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (open) {
      menuRef.current
        ?.querySelector<HTMLElement>(
          '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])',
        )
        ?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [closeMenu, open]);

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    positionMenu(event.clientX, event.clientY);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key === 'ContextMenu' ||
      (event.shiftKey && event.key === 'F10')
    ) {
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      positionMenu(bounds.left, bounds.top);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])',
      ) ?? [],
    );
    const currentIndex = items.findIndex(
      (item) => item === document.activeElement,
    );

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  }

  return (
    <div
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label={label}
      className={cn('group relative', className)}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      ref={rootRef}
      role="group"
      tabIndex={0}
    >
      {children}
      <button
        aria-label={`Open ${label} context menu`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-foreground shadow-sm transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
        onClick={(event) => {
          const bounds =
            event.currentTarget.parentElement?.getBoundingClientRect();
          if (open) {
            closeMenu();
          } else if (bounds) {
            positionMenu(bounds.right - 192, bounds.top);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>
      {open && (
        <div
          className="absolute z-[var(--z-dropdown)] min-w-48 rounded-card border border-border bg-surface-raised p-1.5 shadow-lg"
          id={menuId}
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('[role="menuitem"]')
            ) {
              closeMenu();
            }
          }}
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
          role="menu"
          style={{ left: position.left, top: position.top }}
        >
          {menu}
        </div>
      )}
    </div>
  );
}
