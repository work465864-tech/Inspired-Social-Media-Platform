'use client';

import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export type AnimatedContainerProps = {
  children: ReactNode;
  className?: string;
  duration?: number;
};

export type SlideDirection = 'up' | 'down' | 'left' | 'right';

const offsets: Record<SlideDirection, { x?: number; y?: number }> = {
  up: { y: 12 },
  down: { y: -12 },
  left: { x: 12 },
  right: { x: -12 },
};

export function Fade({
  children,
  className,
  duration = 0.24,
}: AnimatedContainerProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={className}
      initial={reduceMotion ? false : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : duration }}
    >
      {children}
    </motion.div>
  );
}

export function Slide({
  children,
  className,
  direction = 'up',
  duration = 0.24,
}: AnimatedContainerProps & { direction?: SlideDirection }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: 1, x: 0, y: 0 }}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...offsets[direction] }}
      transition={{ duration: reduceMotion ? 0 : duration }}
    >
      {children}
    </motion.div>
  );
}

export function Scale({
  children,
  className,
  duration = 0.18,
}: AnimatedContainerProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      transition={{ duration: reduceMotion ? 0 : duration }}
    >
      {children}
    </motion.div>
  );
}

export function Hover({
  children,
  className,
}: Omit<AnimatedContainerProps, 'duration'>) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduceMotion ? undefined : { y: -3 }}
    >
      {children}
    </motion.div>
  );
}

export function Press({
  children,
  className,
}: Omit<AnimatedContainerProps, 'duration'>) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

export function LoadingMotion({
  children,
  className,
}: Omit<AnimatedContainerProps, 'duration'>) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
      className={className}
      transition={
        reduceMotion
          ? undefined
          : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      {children}
    </motion.div>
  );
}

export function SharedLayout({
  children,
  className,
  id,
}: AnimatedContainerProps & { id: string }) {
  return (
    <LayoutGroup id={id}>
      <motion.div className={className} layout>
        {children}
      </motion.div>
    </LayoutGroup>
  );
}

export function SharedElement({
  children,
  className,
  layoutId,
}: AnimatedContainerProps & { layoutId: string }) {
  return (
    <motion.div className={className} layoutId={layoutId}>
      {children}
    </motion.div>
  );
}
