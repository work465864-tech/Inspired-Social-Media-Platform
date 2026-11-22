'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BackgroundGradient } from './BackgroundGradient';

export function AnimatedBackground() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <BackgroundGradient />
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : { opacity: [0.35, 0.6, 0.35], scale: [1, 1.08, 1] }
        }
        className="absolute left-[12%] top-[20%] h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : { opacity: [0.25, 0.45, 0.25], scale: [1.08, 1, 1.08] }
        }
        className="absolute bottom-[12%] right-[10%] h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        transition={{
          duration: 15,
          ease: 'easeInOut',
          repeat: Infinity,
          delay: 1.5,
        }}
      />
    </div>
  );
}
