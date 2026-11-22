'use client';

import { useCallback, useRef } from 'react';

export function useRequestGate(cooldownMilliseconds = 800) {
  const lastAcceptedAtRef = useRef(Number.NEGATIVE_INFINITY);
  const inFlightRef = useRef(false);

  const acquire = useCallback((): (() => void) | null => {
    const now = Date.now();
    if (
      inFlightRef.current ||
      now - lastAcceptedAtRef.current < cooldownMilliseconds
    ) {
      return null;
    }

    inFlightRef.current = true;
    lastAcceptedAtRef.current = now;
    return () => {
      inFlightRef.current = false;
    };
  }, [cooldownMilliseconds]);

  return acquire;
}
