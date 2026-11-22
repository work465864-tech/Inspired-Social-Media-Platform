'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefCallback } from 'react';
import type { FeedVisibilityUpdate } from '../types/feed';

type UseFeedVisibilityOptions = {
  enabled?: boolean;
  id: string;
  onVisibilityChange: (update: FeedVisibilityUpdate) => void;
  rootMargin?: string;
  threshold?: number;
};

function getVerticalMargins(rootMargin: string): [number, number] {
  const parts = rootMargin.split(/\s+/);
  const top = Number.parseFloat(parts[0] ?? '0') || 0;
  const bottomPart =
    parts.length > 2 ? parts[2] : parts.length > 1 ? parts[0] : parts[0];
  const bottom = Number.parseFloat(bottomPart ?? '0') || 0;
  return [top, bottom];
}

export function useFeedVisibility({
  enabled = true,
  id,
  onVisibilityChange,
  rootMargin = '0px',
  threshold = 0.45,
}: UseFeedVisibilityOptions): {
  isVisible: boolean;
  ref: RefCallback<HTMLElement>;
} {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const callbackRef = useRef(onVisibilityChange);
  callbackRef.current = onVisibilityChange;

  const ref = useCallback<RefCallback<HTMLElement>>((element) => {
    setTarget(element);
  }, []);

  useEffect(() => {
    if (!enabled || !target) {
      return;
    }

    const reportVisibility = (ratio: number) => {
      const normalizedRatio = Math.round(ratio * 100) / 100;
      const visible = normalizedRatio >= threshold;
      setIsVisible((current) => (current === visible ? current : visible));
      callbackRef.current({ id, ratio: normalizedRatio });
    };

    if (typeof IntersectionObserver !== 'undefined') {
      const thresholds = Array.from(new Set([0, threshold, 0.75, 1]));
      const observer = new IntersectionObserver(
        ([entry]) => {
          reportVisibility(entry.isIntersecting ? entry.intersectionRatio : 0);
        },
        { rootMargin, threshold: thresholds },
      );

      observer.observe(target);
      return () => {
        observer.disconnect();
        callbackRef.current({ id, ratio: 0 });
      };
    }

    const [topMargin, bottomMargin] = getVerticalMargins(rootMargin);
    const updateVisibility = () => {
      const rect = target.getBoundingClientRect();
      const top = Math.max(0, rect.top - topMargin);
      const bottom = Math.min(window.innerHeight, rect.bottom + bottomMargin);
      const visibleHeight = Math.max(0, bottom - top);
      reportVisibility(
        rect.height > 0 ? Math.min(1, visibleHeight / rect.height) : 0,
      );
    };

    updateVisibility();
    let updateFrame: number | null = null;
    const scheduleUpdate = () => {
      if (updateFrame !== null) {
        return;
      }

      updateFrame = window.requestAnimationFrame(() => {
        updateFrame = null;
        updateVisibility();
      });
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (updateFrame !== null) {
        window.cancelAnimationFrame(updateFrame);
      }
      callbackRef.current({ id, ratio: 0 });
    };
  }, [enabled, id, rootMargin, target, threshold]);

  return { isVisible, ref };
}
