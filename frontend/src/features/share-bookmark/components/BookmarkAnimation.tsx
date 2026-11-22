'use client';

import { Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { useVideoCardMotion } from '../../video/hooks/useVideoCardMotion';

export const BookmarkAnimation = memo(function BookmarkAnimation({
  bookmarked,
}: {
  bookmarked: boolean;
}) {
  const { reduceMotion } = useVideoCardMotion();

  return (
    <motion.span
      animate={
        bookmarked && !reduceMotion ? { scale: [1, 1.28, 1] } : { scale: 1 }
      }
      aria-hidden="true"
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
    >
      <Bookmark
        className={`h-5 w-5 transition-colors motion-reduce:transition-none ${
          bookmarked ? 'fill-primary text-primary' : 'text-white'
        }`}
      />
    </motion.span>
  );
});
