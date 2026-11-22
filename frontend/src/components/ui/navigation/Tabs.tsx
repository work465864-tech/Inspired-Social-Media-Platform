'use client';

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../../lib/utils';

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: TabItem[];
  label: string;
  selectedIndex?: number;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
};

export function Tabs({
  className,
  defaultIndex = 0,
  items,
  label,
  onChange,
  selectedIndex,
}: TabsProps) {
  const id = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultIndex);
  const currentIndex = selectedIndex ?? uncontrolledIndex;

  function select(index: number) {
    if (selectedIndex === undefined) {
      setUncontrolledIndex(index);
    }
    onChange?.(index);
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLButtonElement>,
  ) {
    const available = items
      .map((item, itemIndex) => (item.disabled ? -1 : itemIndex))
      .filter((itemIndex) => itemIndex >= 0);
    const position = available.indexOf(index);

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next =
        available[(position + direction + available.length) % available.length];
      select(next);
      tabRefs.current[next]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? available[0] : available.at(-1);
      if (next !== undefined) {
        select(next);
        tabRefs.current[next]?.focus();
      }
    }
  }

  if (items.length === 0) {
    return null;
  }

  const activeIndex =
    currentIndex >= 0 &&
    currentIndex < items.length &&
    !items[currentIndex].disabled
      ? currentIndex
      : items.findIndex((item) => !item.disabled);

  return (
    <div className={className}>
      <div
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
      >
        {items.map((item, index) => {
          const active = index === activeIndex;
          const tabId = `${id}-tab-${item.id}`;
          const panelId = `${id}-panel-${item.id}`;

          return (
            <button
              aria-controls={panelId}
              aria-selected={active}
              className={cn(
                'relative min-h-11 shrink-0 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary motion-reduce:transition-none',
                active ? 'text-primary' : 'text-muted hover:text-foreground',
              )}
              disabled={item.disabled}
              id={tabId}
              key={item.id}
              onClick={() => select(index)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={active ? 0 : -1}
              type="button"
            >
              {item.label}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => (
        <div
          aria-labelledby={`${id}-tab-${item.id}`}
          className={index === activeIndex ? 'pt-4' : 'hidden'}
          hidden={index !== activeIndex}
          id={`${id}-panel-${item.id}`}
          key={item.id}
          role="tabpanel"
          tabIndex={index === activeIndex ? 0 : -1}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
