'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { getSwipeDirection, getWheelDirection } from '../services/gestureUtils';

type GestureHandlerProps = {
  children: ReactNode;
  className?: string;
  onNext: () => void;
  onPrevious: () => void;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, a, input, textarea, select, [role="slider"], [data-no-feed-gesture]',
      ),
    )
  );
}

export const GestureHandler = forwardRef<HTMLDivElement, GestureHandlerProps>(
  function GestureHandler(
    { children, className, onNext, onPrevious },
    forwardedRef,
  ) {
    const elementRef = useRef<HTMLDivElement | null>(null);
    const pointerStartY = useRef<number | null>(null);
    const lastNavigationAt = useRef(0);

    const setRefs = useCallback(
      (element: HTMLDivElement | null) => {
        elementRef.current = element;
        if (typeof forwardedRef === 'function') {
          forwardedRef(element);
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }
      },
      [forwardedRef],
    );

    const navigate = useCallback(
      (direction: 'next' | 'previous') => {
        const now = Date.now();
        if (now - lastNavigationAt.current < 420) {
          return;
        }
        lastNavigationAt.current = now;
        if (direction === 'next') {
          onNext();
        } else {
          onPrevious();
        }
      },
      [onNext, onPrevious],
    );

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch' && !isInteractiveTarget(event.target)) {
        pointerStartY.current = event.clientY;
      }
    };

    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
      const startY = pointerStartY.current;
      pointerStartY.current = null;
      if (startY === null || isInteractiveTarget(event.target)) {
        return;
      }

      const direction = getSwipeDirection(startY, event.clientY);
      if (direction) {
        navigate(direction);
      }
    };

    const onWheel = useCallback(
      (event: globalThis.WheelEvent) => {
        if (isInteractiveTarget(event.target)) {
          return;
        }
        const direction = getWheelDirection(event.deltaY, event.deltaX);
        if (!direction) {
          return;
        }
        event.preventDefault();
        navigate(direction);
      },
      [navigate],
    );

    useEffect(() => {
      const element = elementRef.current;
      if (!element) {
        return;
      }
      element.addEventListener('wheel', onWheel, { passive: false });
      return () => element.removeEventListener('wheel', onWheel);
    }, [onWheel]);

    const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.target !== event.currentTarget ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        event.stopPropagation();
        navigate('next');
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        event.stopPropagation();
        navigate('previous');
      }
    };

    return (
      <div
        aria-label="Video feed. Use up and down arrow keys to navigate."
        className={className}
        onKeyDownCapture={onKeyDownCapture}
        onPointerCancel={() => {
          pointerStartY.current = null;
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        ref={setRefs}
        role="feed"
        tabIndex={0}
      >
        {children}
        <p className="sr-only">
          Swipe or use the up and down arrow keys to move between videos. Use
          the video controls to play, pause, adjust volume, seek, or enter
          fullscreen.
        </p>
      </div>
    );
  },
);

GestureHandler.displayName = 'GestureHandler';
