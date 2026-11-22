'use client';

import { Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { paths } from '../../constants/paths.js';

export function FloatingActionButton() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  if (pathname === paths.upload) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-30 hidden md:block lg:hidden"
      whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
    >
      <Link
        aria-label="Upload a post"
        className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        href={paths.upload}
        title="Upload"
      >
        <Plus aria-hidden="true" className="h-6 w-6" />
      </Link>
    </motion.div>
  );
}
