'use client';

import { useCallback, useRef, useState } from 'react';
import type { TouchEvent } from 'react';

const refreshThreshold = 72;
const maximumPullDistance = 96;

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  disabled = false,
) {
  const startYRef = useRef<number | null>(null);
  const latestDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (disabled || window.scrollY > 0 || event.touches.length !== 1) {
        startYRef.current = null;
        return;
      }

      startYRef.current = event.touches[0]?.clientY ?? null;
      latestDistanceRef.current = 0;
    },
    [disabled],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (startYRef.current === null || disabled || window.scrollY > 0) {
        return;
      }

      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) {
        return;
      }

      const distance = Math.min(
        Math.max(0, currentY - startYRef.current),
        maximumPullDistance,
      );
      latestDistanceRef.current = distance;
      setPullDistance(distance);
    },
    [disabled],
  );

  const handleTouchEnd = useCallback(() => {
    startYRef.current = null;
    const shouldRefresh = latestDistanceRef.current >= refreshThreshold;
    latestDistanceRef.current = 0;

    if (!shouldRefresh || disabled) {
      setPullDistance(0);
      return;
    }

    void onRefresh()
      .catch((error: unknown) => {
        console.error('Unable to refresh the feed.', error);
      })
      .finally(() => setPullDistance(0));
  }, [disabled, onRefresh]);

  const resetPull = useCallback(() => {
    startYRef.current = null;
    latestDistanceRef.current = 0;
    setPullDistance(0);
  }, []);

  return {
    isReadyToRefresh: pullDistance >= refreshThreshold,
    onTouchCancel: resetPull,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onTouchStart: handleTouchStart,
    pullDistance,
  };
}
