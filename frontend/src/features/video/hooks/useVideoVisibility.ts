'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RefCallback } from 'react';
import { videoVisibilityOptions } from '../constants/player';

type UseVideoVisibilityOptions = {
  enabled: boolean;
};

export function useVideoVisibility({ enabled }: UseVideoVisibilityOptions): {
  isVisible: boolean;
  visibilityRef: RefCallback<HTMLElement>;
} {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(!enabled);

  const visibilityRef = useCallback<RefCallback<HTMLElement>>((element) => {
    setTarget(element);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    if (!target) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(
        entry.isIntersecting &&
          entry.intersectionRatio >= videoVisibilityOptions.threshold,
      );
    }, videoVisibilityOptions);

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, target]);

  return { isVisible, visibilityRef };
}
