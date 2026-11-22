'use client';

import {
  Heart,
  LoaderCircle,
  MessageCircle,
  UserRound,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import Link from 'next/link';
import { paths } from '../../../constants/paths.js';
import type { VideoStats } from '../types/video';
import { useVideoCardMotion } from '../hooks/useVideoCardMotion';
import { likeAnimationService } from '../../likes/services/likeAnimationService';
import { CommentSheet } from '../../comments/components/CommentSheet';
import { useVideoCommentsCount } from '../../comments/hooks/useVideoCommentsCount';
import { commentFormatter } from '../../comments/services/commentFormatter';
import { BookmarkButton } from '../../share-bookmark/components/BookmarkButton';
import { ShareButton } from '../../share-bookmark/components/ShareButton';

type VideoActionProps = {
  count?: string;
};

export type LikeButtonState = {
  count: number;
  countFallback: string;
  disabled: boolean;
  disabledReason: string | null;
  error: Error | null;
  isLoading: boolean;
  isPending: boolean;
  isReady: boolean;
  liked: boolean;
  onRetry: () => void;
  onToggle: () => void;
};

function ActionButton({
  count,
  icon: Icon,
  label,
}: VideoActionProps & {
  icon: LucideIcon;
  label: string;
}) {
  const { hover, reduceMotion, tap } = useVideoCardMotion();

  return (
    <motion.button
      aria-disabled="true"
      aria-label={`${label}${count ? `, ${count}` : ''} (preview only)`}
      className="group relative grid min-h-12 min-w-12 place-items-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 motion-reduce:transition-none"
      type="button"
      whileHover={hover}
      whileTap={tap}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 transition duration-300 group-active:scale-150 group-active:opacity-100 motion-reduce:transition-none"
      />
      <Icon aria-hidden="true" className="relative h-5 w-5" />
      {count && (
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-0.5 max-w-full truncate text-[0.625rem] font-semibold leading-none text-white drop-shadow"
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          key={count}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {count}
        </motion.span>
      )}
    </motion.button>
  );
}

export const LikeButton = memo(function LikeButton({
  count,
  countFallback,
  disabled,
  disabledReason,
  error,
  isLoading,
  isPending,
  isReady,
  liked,
  onRetry,
  onToggle,
}: LikeButtonState) {
  const { hover, reduceMotion, tap } = useVideoCardMotion();
  const formattedCount = isReady
    ? likeAnimationService.formatCount(count)
    : countFallback;

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        aria-busy={isPending || isLoading}
        aria-label={`${liked ? 'Unlike' : 'Like'} video, ${formattedCount} likes${disabledReason ? `. ${disabledReason}` : ''}`}
        aria-pressed={liked}
        className="group relative grid min-h-12 min-w-12 place-items-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        type="button"
        whileHover={disabled ? undefined : hover}
        whileTap={disabled ? undefined : tap}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 transition duration-300 group-active:scale-150 group-active:opacity-100 motion-reduce:transition-none"
        />
        {isLoading || isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="relative h-5 w-5 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Heart
            aria-hidden="true"
            className={`relative h-5 w-5 transition-transform motion-reduce:transition-none ${
              liked ? 'scale-110 fill-rose-500 text-rose-400' : 'text-white'
            }`}
          />
        )}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            aria-live="polite"
            aria-atomic="true"
            className="relative mt-0.5 max-w-full truncate text-[0.625rem] font-semibold leading-none text-white drop-shadow"
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            key={formattedCount}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            {formattedCount}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      {error && (
        <span
          aria-live="assertive"
          className="max-w-24 text-center text-[0.625rem] font-medium text-rose-200"
          role="alert"
        >
          {error.message}
        </span>
      )}
      {disabledReason && (
        <span aria-live="polite" className="sr-only" role="status">
          {disabledReason}
        </span>
      )}
      {!isReady && error && (
        <button
          className="min-h-8 rounded px-1 text-[0.625rem] font-semibold text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={(event) => {
            event.stopPropagation();
            onRetry();
          }}
          type="button"
        >
          Retry
        </button>
      )}
    </div>
  );
});

export const CommentButton = memo(function CommentButton({
  count,
  initialCount,
  videoId,
}: VideoActionProps & {
  initialCount: number;
  videoId: string;
}) {
  const [open, setOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const { hover, reduceMotion, tap } = useVideoCardMotion();
  const comments = useVideoCommentsCount(videoId, initialCount);
  const formattedCount = comments.isReady
    ? commentFormatter.formatCount(comments.count)
    : (count ?? commentFormatter.formatCount(initialCount));

  return (
    <>
      <motion.button
        aria-expanded={open}
        aria-label={`View comments, ${formattedCount} comments`}
        aria-haspopup="dialog"
        className="group relative grid min-h-12 min-w-12 place-items-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 motion-reduce:transition-none"
        onClick={(event) => {
          event.stopPropagation();
          setSheetMounted(true);
          setOpen(true);
        }}
        onPointerUp={(event) => event.stopPropagation()}
        type="button"
        whileHover={hover}
        whileTap={tap}
      >
        <MessageCircle aria-hidden="true" className="h-5 w-5" />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            aria-live="polite"
            aria-atomic="true"
            className="mt-0.5 max-w-full truncate text-[0.625rem] font-semibold leading-none text-white drop-shadow"
            animate={{ opacity: 1, y: 0 }}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            key={formattedCount}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            {formattedCount}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      {sheetMounted && (
        <CommentSheet
          initialCount={initialCount}
          liveCount={comments.count}
          onOpenChange={setOpen}
          open={open}
          videoId={videoId}
        />
      )}
    </>
  );
});

export const MuteButton = memo(function MuteButton() {
  return <ActionButton icon={VolumeX} label="Sound muted" />;
});

export const ProfileButton = memo(function ProfileButton({
  username,
}: {
  username: string;
}) {
  const { hover, reduceMotion, tap } = useVideoCardMotion();
  return (
    <Link
      aria-label="View creator profile"
      className="grid min-h-12 min-w-12 place-items-center rounded-full border border-white/20 bg-black/20 text-white shadow-lg backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      href={paths.creatorProfile(username)}
    >
      <motion.span
        whileHover={hover}
        whileTap={tap}
        transition={{ duration: reduceMotion ? 0 : 0.15 }}
      >
        <UserRound aria-hidden="true" className="h-5 w-5" />
      </motion.span>
    </Link>
  );
});

export const VideoActions = memo(function VideoActions({
  commentsCount,
  likeButton,
  stats,
  videoId,
  videoAuthor,
  videoCaption,
  creatorUsername,
}: {
  stats: VideoStats;
  likeButton: LikeButtonState;
  videoId: string;
  commentsCount: number;
  videoAuthor: string;
  videoCaption: string;
  creatorUsername: string;
}) {
  return (
    <aside
      aria-label="Video actions"
      className="flex flex-col items-center gap-3"
    >
      <LikeButton {...likeButton} />
      <CommentButton
        count={stats.comments}
        initialCount={commentsCount}
        videoId={videoId}
      />
      <ShareButton
        text={videoCaption}
        title={`${videoAuthor} on Connectly`}
        videoId={videoId}
      />
      <BookmarkButton videoId={videoId} />
      <MuteButton />
      <ProfileButton username={creatorUsername} />
    </aside>
  );
});
