'use client';

import { useInView } from 'react-intersection-observer';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLike, useUnlike, useVideoLikes } from '../../likes';
import { VideoPlayer } from '../../video/components/VideoPlayer';
import type { LikeButtonState } from '../../video/components/VideoActions';
import { useVideoAnalyticsTracking } from '../../creator-analytics/hooks/useVideoAnalyticsTracking';
import type { Video } from '../types';
import { VideoOverlay } from './VideoOverlay';

type VideoCardProps = {
  active: boolean;
  index: number;
  onVisibilityChange: (id: string, ratio: number) => void;
  preloadNext: boolean;
  root: HTMLElement | null;
  video: Video;
};

export function VideoCard({
  active,
  index,
  onVisibilityChange,
  preloadNext,
  root,
  video,
}: VideoCardProps) {
  const reduceMotion = useReducedMotion();
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const likes = useVideoLikes(video.id, video.likes);
  const {
    like: addLike,
    error: likeMutationError,
    isPending: isLikePendingState,
  } = useLike();
  const {
    unlike: removeLike,
    error: unlikeMutationError,
    isPending: isUnlikePendingState,
  } = useUnlike();
  const isLikePending = isLikePendingState || isUnlikePendingState;
  const liked = !video.isDemoContent && likes.liked;
  const burstTimer = useRef<number | null>(null);
  const impressionTimer = useRef<number | null>(null);
  const analytics = useVideoAnalyticsTracking({
    creatorId: video.creator.id,
    isDemoContent: video.isDemoContent,
    videoId: video.id,
  });
  const { entry, inView, ref } = useInView({
    root,
    skip: root === null,
    threshold: [0, 0.2, 0.6, 0.85],
  });
  const intersectionRatio = entry?.intersectionRatio ?? 0;

  useEffect(() => {
    onVisibilityChange(video.id, intersectionRatio);
  }, [intersectionRatio, onVisibilityChange, video.id]);

  useEffect(
    () => () => {
      if (burstTimer.current !== null) {
        window.clearTimeout(burstTimer.current);
      }
      if (impressionTimer.current !== null) {
        window.clearTimeout(impressionTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (impressionTimer.current !== null) {
      window.clearTimeout(impressionTimer.current);
      impressionTimer.current = null;
    }
    if (!active || !inView || intersectionRatio < 0.6) {
      return;
    }

    impressionTimer.current = window.setTimeout(
      analytics.trackImpression,
      1000,
    );
    return () => {
      if (impressionTimer.current !== null) {
        window.clearTimeout(impressionTimer.current);
        impressionTimer.current = null;
      }
    };
  }, [active, analytics.trackImpression, inView, intersectionRatio]);

  const likeWithBurst = useCallback(() => {
    if (
      video.isDemoContent ||
      !isAuthenticated ||
      isAuthLoading ||
      !likes.isReady ||
      isLikePending ||
      liked ||
      !addLike(video.id)
    ) {
      return;
    }

    setShowLikeBurst(true);
    if (burstTimer.current !== null) {
      window.clearTimeout(burstTimer.current);
    }
    burstTimer.current = window.setTimeout(() => setShowLikeBurst(false), 820);
  }, [
    isAuthLoading,
    isAuthenticated,
    isLikePending,
    addLike,
    liked,
    likes.isReady,
    video.id,
    video.isDemoContent,
  ]);
  const toggleLike = useCallback(() => {
    if (
      video.isDemoContent ||
      !isAuthenticated ||
      !likes.isReady ||
      isLikePending
    ) {
      return;
    }
    if (liked) {
      removeLike(video.id);
    } else {
      addLike(video.id);
    }
  }, [
    isAuthenticated,
    isLikePending,
    addLike,
    liked,
    likes.isReady,
    removeLike,
    video.id,
    video.isDemoContent,
  ]);
  const likeError =
    likeMutationError ??
    unlikeMutationError ??
    (likes.error instanceof Error ? likes.error : null);
  const likeButton: LikeButtonState = {
    count: likes.count,
    countFallback: video.likes.toLocaleString(),
    disabled:
      video.isDemoContent ||
      !isAuthenticated ||
      isAuthLoading ||
      !likes.isReady ||
      isLikePending,
    disabledReason: video.isDemoContent
      ? 'Likes are unavailable for demo videos.'
      : isAuthLoading
        ? 'Checking your sign-in status.'
        : !isAuthenticated
          ? 'Sign in to like videos.'
          : !likes.isReady
            ? 'Loading the current like status.'
            : isLikePending
              ? 'Updating like.'
              : null,
    error: likeError,
    isLoading: !video.isDemoContent && (likes.isLoading || isAuthLoading),
    isPending: isLikePending,
    isReady: video.isDemoContent || likes.isReady,
    liked,
    onRetry: () => {
      void likes.refetch();
    },
    onToggle: toggleLike,
  };

  return (
    <motion.article
      animate={{ opacity: 1, scale: 1 }}
      aria-label={`Video ${index + 1}: ${video.title}`}
      className="relative h-full w-full overflow-hidden rounded-2xl bg-black sm:rounded-[1.65rem]"
      initial={reduceMotion ? false : { opacity: 0.75, scale: 0.985 }}
      ref={ref}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
    >
      <VideoPlayer
        autoPauseWhenOffscreen
        autoPlay={active && inView}
        className="h-full w-full max-w-none rounded-none shadow-none ring-0"
        fit="cover"
        isActive={active && inView}
        loop
        muted
        onDoubleTap={likeWithBurst}
        onPlaybackStateChange={analytics.onPlaybackStateChange}
        overlay={
          <VideoOverlay
            likeButton={likeButton}
            onShare={analytics.trackShare}
            showLikeBurst={showLikeBurst}
            video={video}
          />
        }
        preloadNext={preloadNext}
        poster={video.thumbnail ?? undefined}
        showReplayButton
        src={video.playbackUrl}
        title={`${video.creator.name}: ${video.title}`}
      />
      <AnimatePresence>
        {active && !inView && (
          <motion.p
            animate={{ opacity: 1 }}
            aria-live="polite"
            className="sr-only"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            role="status"
          >
            Video paused.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
