'use client';

import { useReducedMotion } from 'framer-motion';

export function useVideoCardMotion() {
  const reduceMotion = useReducedMotion();

  return {
    reduceMotion,
    cardInitial: reduceMotion ? false : { opacity: 0, y: 12 },
    cardTransition: {
      duration: reduceMotion ? 0 : 0.28,
      ease: 'easeOut' as const,
    },
    hover: reduceMotion ? undefined : { scale: 1.015 },
    tap: reduceMotion ? undefined : { scale: 0.97 },
  };
}
