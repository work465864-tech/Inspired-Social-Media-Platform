'use client';

import { useInView } from 'react-intersection-observer';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPlayer } from '../../video/components/VideoPlayer';
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
  const [liked, setLiked] = useState(false);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
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
    setLiked(true);
    setShowLikeBurst(true);
    if (burstTimer.current !== null) {
      window.clearTimeout(burstTimer.current);
    }
    burstTimer.current = window.setTimeout(() => setShowLikeBurst(false), 820);
  }, []);
  const toggleLike = useCallback(() => {
    setLiked((current) => !current);
  }, []);

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
            isLiked={liked}
            onLike={toggleLike}
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
