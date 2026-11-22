'use client';

import { useEffect, useRef } from 'react';
import { feedScrollManager } from '../services/scrollManager';

type UseFeedScrollOptions = {
  activeItemId: string | null;
  ensureContentForRestore: (
    scrollY: number,
    signal: AbortSignal,
  ) => Promise<void>;
  feedKey: string;
  isReady: boolean;
};

export function useFeedScroll({
  activeItemId,
  ensureContentForRestore,
  feedKey,
  isReady,
}: UseFeedScrollOptions): void {
  const activeItemIdRef = useRef(activeItemId);
  const ensureContentRef = useRef(ensureContentForRestore);
  activeItemIdRef.current = activeItemId;
  ensureContentRef.current = ensureContentForRestore;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const previousRestoration = window.history.scrollRestoration;
    const abortController = new AbortController();
    let restored = false;
    let saveFrame: number | null = null;
    window.history.scrollRestoration = 'manual';

    const savePosition = () => {
      feedScrollManager.save(feedKey, {
        scrollY: window.scrollY,
        activeItemId: activeItemIdRef.current,
      });
    };

    const handleScroll = () => {
      if (!restored || saveFrame !== null) {
        return;
      }

      saveFrame = window.requestAnimationFrame(() => {
        saveFrame = null;
        savePosition();
      });
    };

    const handlePageHide = () => {
      if (restored) {
        savePosition();
      }
    };

    const restore = async () => {
      const position = feedScrollManager.read(feedKey);
      if (position) {
        try {
          await ensureContentRef.current(
            position.scrollY,
            abortController.signal,
          );
        } catch (error) {
          console.error(
            'Unable to load enough feed content to restore scroll.',
            error,
          );
        }
      }

      if (abortController.signal.aborted) {
        return;
      }

      window.scrollTo({ top: position?.scrollY ?? 0, behavior: 'auto' });
      restored = true;
    };

    void restore();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handlePageHide);

    return () => {
      abortController.abort();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handlePageHide);
      if (saveFrame !== null) {
        window.cancelAnimationFrame(saveFrame);
      }
      if (restored) {
        savePosition();
      }
      window.history.scrollRestoration = previousRestoration;
    };
  }, [feedKey, isReady]);
}
