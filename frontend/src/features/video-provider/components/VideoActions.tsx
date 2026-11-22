'use client';

import { Bookmark, MessageCircle, Share2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import {
  CommentButton as PersistentCommentButton,
  LikeButton,
  type LikeButtonState,
} from '../../video/components/VideoActions';
import type { Video } from '../types';

type VideoActionsProps = {
  likeButton: LikeButtonState;
  onShare: (method?: 'native' | 'copy' | 'external') => void;
  video: Video;
};

function formatCount(count: number): string {
  return new Intl.NumberFormat('en', {
    notation: count >= 1_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(count);
}

export function VideoActions({
  likeButton,
  onShare,
  video,
}: VideoActionsProps) {
  const reduceMotion = useReducedMotion();
  const [bookmarked, setBookmarked] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const shareVideo = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: `Watch ${video.title}`,
          url: video.attribution.url,
        });
        onShare('native');
      } else {
        await navigator.clipboard.writeText(video.attribution.url);
        onShare('copy');
      }
      setShareMessage('Video link shared.');
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Sharing cancelled.'
          : 'Unable to share this video.';
      setShareMessage(message);
    }
  };

  return (
    <aside
      aria-label="Video actions"
      className="flex flex-col items-center gap-4"
    >
      <LikeButton {...likeButton} />

      {video.isDemoContent ? (
        <button
          aria-label={`Comments unavailable for demo videos, ${formatCount(video.comments)} comments`}
          className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-full text-white drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled
          title="Comments are not available for demo videos"
          type="button"
        >
          <MessageCircle aria-hidden="true" className="h-6 w-6" />
          <span className="text-[0.6875rem] font-semibold">
            {formatCount(video.comments)}
          </span>
        </button>
      ) : (
        <PersistentCommentButton
          count={formatCount(video.comments)}
          initialCount={video.comments}
          videoId={video.id}
        />
      )}

      <motion.button
        aria-label="Share video"
        className="grid min-h-12 min-w-12 place-items-center rounded-full text-white drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        onClick={(event) => {
          event.stopPropagation();
          void shareVideo();
        }}
        type="button"
        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
      >
        <Share2 aria-hidden="true" className="h-6 w-6" />
      </motion.button>

      <motion.button
        aria-label={`${bookmarked ? 'Remove local bookmark' : 'Add local bookmark'} (demo only)`}
        aria-pressed={bookmarked}
        className="grid min-h-12 min-w-12 place-items-center rounded-full text-white drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        onClick={(event) => {
          event.stopPropagation();
          setBookmarked((value) => !value);
        }}
        type="button"
        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
      >
        <Bookmark
          aria-hidden="true"
          className={`h-6 w-6 ${bookmarked ? 'fill-white' : ''}`}
        />
      </motion.button>

      <span aria-live="polite" className="sr-only" role="status">
        {shareMessage}
      </span>
    </aside>
  );
}
