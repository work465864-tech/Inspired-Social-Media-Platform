'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { likeAnimationService } from '../services/likeAnimationService';

type DoubleTapLikeOptions = {
  enabled: boolean;
  isLiked: boolean;
  isPending: boolean;
  onLike: (videoId: string) => boolean;
  videoId: string;
};

type PointerPoint = {
  x: number;
  y: number;
  time: number;
};

export function useDoubleTapLike({
  enabled,
  isLiked,
  isPending,
  onLike,
  videoId,
}: DoubleTapLikeOptions) {
  const previousTap = useRef<PointerPoint | null>(null);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heartVisible, setHeartVisible] = useState(false);
  const [heartKey, setHeartKey] = useState(0);

  useEffect(
    () => () => {
      if (heartTimer.current) {
        clearTimeout(heartTimer.current);
      }
    },
    [],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'button, a, input, select, textarea, [role="slider"], [contenteditable="true"]',
        )
      ) {
        previousTap.current = null;
        return;
      }

      const currentTap: PointerPoint = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      };
      const isDoubleTap = likeAnimationService.isDoubleTap(
        previousTap.current,
        currentTap,
      );
      previousTap.current = isDoubleTap ? null : currentTap;

      if (!isDoubleTap || !enabled || isPending) {
        return;
      }

      event.preventDefault();
      if (!isLiked) {
        onLike(videoId);
      }
      setHeartKey((current) => current + 1);
      setHeartVisible(true);
      if (heartTimer.current) {
        clearTimeout(heartTimer.current);
      }
      heartTimer.current = setTimeout(
        () => setHeartVisible(false),
        likeAnimationService.heartDurationMs,
      );
    },
    [enabled, isLiked, isPending, onLike, videoId],
  );

  return { heartKey, heartVisible, onPointerUp };
}
