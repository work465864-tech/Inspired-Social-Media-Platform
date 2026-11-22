'use client';

import { LoaderCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export function VideoLoader({
  compact = false,
  label = 'Loading video',
}: {
  compact?: boolean;
  label?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (compact) {
    return (
      <div
        aria-label={label}
        aria-live="polite"
        className="flex items-center justify-center gap-2 py-4 text-sm text-white/80"
        role="status"
      >
        <LoaderCircle
          aria-hidden="true"
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
        />
        {label}
      </div>
    );
  }

  return (
    <motion.div
      aria-busy="true"
      aria-label={label}
      className="relative min-h-[26rem] overflow-hidden rounded-2xl bg-surface-raised sm:rounded-[1.65rem]"
      role="status"
      animate={{ opacity: 1 }}
      initial={reduceMotion ? false : { opacity: 0.65 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-raised via-slate-400/20 to-primary/10 motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </motion.div>
  );
}
