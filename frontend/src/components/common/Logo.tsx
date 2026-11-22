'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '../../lib/utils';

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Logo({ className, showWordmark = true }: LogoProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Link
        aria-label="Connectly home"
        className={cn('inline-flex items-center gap-3', className)}
        href="/"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 rounded-control shadow-glow"
          height={40}
          priority
          src="/connectly-mark.svg"
          width={40}
        />
        {showWordmark && (
          <span className="text-lg font-bold tracking-tight text-foreground">
            connectly
          </span>
        )}
      </Link>
    </motion.div>
  );
}
