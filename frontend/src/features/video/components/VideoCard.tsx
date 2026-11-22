'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { memo, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import type { VideoItem } from '../types/video';
import { useVideoCardMotion } from '../hooks/useVideoCardMotion';
import { VideoOverlay } from './VideoOverlay';
import { VideoThumbnail } from './VideoParts';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  useDoubleTapLike,
  useLike,
  useUnlike,
  useVideoLikes,
} from '../../likes';

export type VideoCardProps = {
  video: VideoItem;
  className?: string;
  index?: number;
};

export const VideoCard = memo(function VideoCard({
  className,
  index = 0,
  video,
}: VideoCardProps) {
  const { cardInitial, cardTransition, reduceMotion } = useVideoCardMotion();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const likes = useVideoLikes(video.id, video.likesCount ?? 0);
  const {
    like,
    error: likeMutationError,
    isPending: isLikePending,
  } = useLike();
  const {
    unlike,
    error: unlikeMutationError,
    isPending: isUnlikePending,
  } = useUnlike();
  const {
    count,
    error: likesError,
    isLoading,
    isReady,
    liked,
    refetch,
  } = likes;
  const isPending = isLikePending || isUnlikePending;
  const onLike = useCallback((videoId: string) => like(videoId), [like]);
  const onToggleLike = useCallback(() => {
    if (liked) {
      unlike(video.id);
    } else {
      like(video.id);
    }
  }, [like, liked, unlike, video.id]);
  const retryLikeState = useCallback(() => {
    void refetch();
  }, [refetch]);
  const likeError =
    likeMutationError ??
    unlikeMutationError ??
    (likesError instanceof Error ? likesError : null);
  const likeButton = {
    count,
    countFallback: video.stats.likes,
    disabled: !isAuthenticated || isAuthLoading || !isReady || isPending,
    disabledReason: isAuthLoading
      ? 'Checking your sign-in status.'
      : !isAuthenticated
        ? 'Sign in to like videos.'
        : !isReady
          ? 'Loading the current like status.'
          : isPending
            ? 'Updating like.'
            : null,
    error: likeError,
    isLoading: isLoading || isAuthLoading,
    isPending,
    isReady,
    liked,
    onRetry: retryLikeState,
    onToggle: onToggleLike,
  };
  const doubleTap = useDoubleTapLike({
    enabled: isAuthenticated && isReady,
    isLiked: liked,
    isPending,
    onLike,
    videoId: video.id,
  });

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      aria-label={`Video by ${video.displayName}`}
      className={cn(
        'relative isolate min-h-[calc(100svh-9rem)] overflow-hidden bg-slate-700 shadow-xl ring-1 ring-black/5 sm:min-h-[min(78svh,54rem)] sm:rounded-[1.65rem]',
        className,
      )}
      initial={cardInitial}
      transition={{
        ...cardTransition,
        delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.2),
      }}
      onPointerUp={doubleTap.onPointerUp}
    >
      <VideoThumbnail video={video} />
      <VideoOverlay likeButton={likeButton} video={video} />
      <AnimatePresence>
        {doubleTap.heartVisible && (
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
            key={doubleTap.heartKey}
            transition={{ duration: reduceMotion ? 0 : 0.85, ease: 'easeOut' }}
          >
            <Heart className="h-24 w-24 fill-current sm:h-28 sm:w-28" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
});
