'use client';

import { AlertCircle, LoaderCircle, Pause, Play, RotateCw } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import { cn } from '../../../lib/utils';
import { VideoPlaceholder } from './VideoParts';

export const VideoPoster = memo(function VideoPoster({
  poster,
  title,
  visible,
}: {
  poster?: string;
  title: string;
  visible: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          animate={{ opacity: 1 }}
          aria-hidden="true"
          className="absolute inset-0 z-[1] overflow-hidden bg-slate-800"
          exit={{ opacity: 0 }}
          initial={reduceMotion ? false : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
        >
          {poster ? (
            <img
              alt=""
              className="h-full w-full object-cover"
              decoding="async"
              loading="lazy"
              src={poster}
              title={title}
            />
          ) : (
            <VideoPlaceholder />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const VideoLoading = memo(function VideoLoading({
  visible,
}: {
  visible: boolean;
}) {
  return visible ? (
    <div
      aria-label="Loading video"
      className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/35 p-3 text-white backdrop-blur-sm"
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-6 w-6 animate-spin motion-reduce:animate-none"
      />
      <span className="sr-only">Loading video</span>
    </div>
  ) : null;
});

export const VideoBuffering = memo(function VideoBuffering({
  visible,
}: {
  visible: boolean;
}) {
  return visible ? (
    <div
      aria-label="Video is buffering"
      className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/35 p-3 text-white backdrop-blur-sm"
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-6 w-6 animate-spin motion-reduce:animate-none"
      />
      <span className="sr-only">Video is buffering</span>
    </div>
  ) : null;
});

export const VideoError = memo(function VideoError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      aria-live="assertive"
      className="absolute inset-0 z-40 grid place-items-center bg-black/75 p-6 text-center backdrop-blur-sm"
      role="alert"
    >
      <div className="max-w-sm">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-rose-300"
        />
        <h2 className="mt-3 text-base font-semibold text-white">
          Video unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/75">{message}</p>
        <button
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transition-none"
          onClick={(event) => {
            event.stopPropagation();
            onRetry();
          }}
          type="button"
        >
          <RotateCw aria-hidden="true" className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
});

export const PlayPauseOverlay = memo(function PlayPauseOverlay({
  visible,
  playing,
}: {
  visible: boolean;
  playing: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = playing ? Pause : Play;

  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 z-20 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/30 text-white shadow-xl backdrop-blur-md',
          )}
          exit={{ opacity: 0, scale: 0.85 }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
        >
          <Icon
            className={playing ? 'h-6 w-6' : 'ml-0.5 h-6 w-6 fill-current'}
          />
        </motion.span>
      )}
    </AnimatePresence>
  );
});
