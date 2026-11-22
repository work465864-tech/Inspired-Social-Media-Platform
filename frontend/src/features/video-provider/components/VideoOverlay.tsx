'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { VideoActions } from './VideoActions';
import { VideoDescription } from './VideoDescription';
import type { Video } from '../types';

export function VideoOverlay({
  isLiked,
  onLike,
  onShare,
  showLikeBurst,
  video,
}: {
  isLiked: boolean;
  onLike: () => void;
  onShare: (method?: 'native' | 'copy' | 'external') => void;
  showLikeBurst: boolean;
  video: Video;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 flex items-end gap-3 bg-gradient-to-t from-black/85 via-black/10 to-transparent p-4 pb-5 sm:p-6">
        <div className="pointer-events-auto min-w-0 flex-1">
          <VideoDescription video={video} />
          <a
            className="mt-3 inline-flex min-h-8 items-center rounded-full border border-white/40 bg-black/25 px-3 text-xs font-semibold text-white backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            href={video.attribution.url}
            rel="noreferrer"
            target="_blank"
          >
            Video via {video.attribution.label}
          </a>
        </div>
        <div className="pointer-events-auto pb-2">
          <VideoActions
            liked={isLiked}
            onLike={onLike}
            onShare={onShare}
            video={video}
          />
        </div>
      </div>

      <AnimatePresence>
        {showLikeBurst && (
          <motion.div
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: [0, 1, 0], scale: [0.35, 1.15, 1] }
            }
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-rose-500 drop-shadow-[0_8px_24px_rgba(0,0,0,.4)]"
            exit={{ opacity: 0 }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.35 }}
            key="like-burst"
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut' }}
          >
            <Heart className="h-24 w-24 fill-current sm:h-28 sm:w-28" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
