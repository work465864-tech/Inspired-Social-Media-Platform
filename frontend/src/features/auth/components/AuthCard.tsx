'use client';

import type { HTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import { cn } from '../../../lib/utils';

type AuthCardProps = HTMLAttributes<HTMLDivElement>;

export function AuthCard({ children, className, ...props }: AuthCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.985 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <GlassCard className={cn('p-6 sm:p-8', className)} {...props}>
        {children}
      </GlassCard>
    </motion.div>
  );
}
