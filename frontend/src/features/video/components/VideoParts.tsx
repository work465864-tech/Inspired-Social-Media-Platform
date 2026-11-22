'use client';

import { Check, MapPin, Music2, Play, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/display/Avatar';
import { paths } from '../../../constants/paths.js';
import type { VideoItem } from '../types/video';
import { defaultVideoLocation, videoAccentClasses } from '../constants/video';
import { useVideoCardMotion } from '../hooks/useVideoCardMotion';

export const VerifiedBadge = memo(function VerifiedBadge() {
  return (
    <span
      aria-label="Verified creator"
      className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sky-400 text-slate-950"
      role="img"
      title="Verified creator"
    >
      <Check aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={3} />
    </span>
  );
});

export const FollowButton = memo(function FollowButton({
  following = false,
}: {
  following?: boolean;
}) {
  const { hover, tap } = useVideoCardMotion();

  return (
    <motion.button
      aria-disabled="true"
      aria-label={
        following ? 'Following creator (preview)' : 'Follow creator (preview)'
      }
      className="group relative min-h-8 overflow-hidden rounded-pill border border-white/65 bg-white/15 px-3 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 motion-reduce:transition-none"
      type="button"
      whileHover={hover}
      whileTap={tap}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-pill bg-white/20 opacity-0 transition duration-300 group-active:scale-150 group-active:opacity-100 motion-reduce:transition-none"
      />
      <span className="relative">{following ? 'Following' : 'Follow'}</span>
    </motion.button>
  );
});

export const VideoAuthor = memo(function VideoAuthor({
  video,
}: {
  video: VideoItem;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Link
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        href={paths.creatorProfile(video.username)}
      >
        <Avatar
          alt={`${video.displayName}'s profile`}
          className="h-10 w-10 border-2 border-white/70 bg-black/25 text-white shadow-lg"
          name={video.displayName}
          size="md"
          src={video.avatarUrl}
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold text-white drop-shadow">
              @{video.username}
            </span>
            {video.verified && <VerifiedBadge />}
          </span>
          <span className="block truncate text-xs text-white/75">
            {video.displayName}
          </span>
        </span>
      </Link>
      <div className="shrink-0">
        <FollowButton following={video.following} />
      </div>
    </div>
  );
});

export const VideoCaption = memo(function VideoCaption({
  caption,
}: {
  caption: string;
}) {
  return (
    <p className="line-clamp-3 text-sm font-medium leading-6 text-white drop-shadow sm:text-[0.9375rem]">
      {caption}
    </p>
  );
});

export const VideoMusic = memo(function VideoMusic({
  music,
}: {
  music: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-white/90">
      <Music2 aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="truncate">{music}</span>
    </div>
  );
});

export const VideoStats = memo(function VideoStats({
  stats,
}: {
  stats: VideoItem['stats'];
}) {
  return (
    <dl className="sr-only">
      <div>
        <dt>Likes</dt>
        <dd>{stats.likes}</dd>
      </div>
      <div>
        <dt>Comments</dt>
        <dd>{stats.comments}</dd>
      </div>
      <div>
        <dt>Shares</dt>
        <dd>{stats.shares}</dd>
      </div>
      <div>
        <dt>Bookmarks</dt>
        <dd>{stats.bookmarks}</dd>
      </div>
    </dl>
  );
});

export const VideoGradient = memo(function VideoGradient() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/75 via-black/25 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.12),transparent_38%,rgba(0,0,0,.12))]"
      />
    </>
  );
});

export const VideoPlaceholder = memo(function VideoPlaceholder({
  accent = 'violet',
}: {
  accent?: NonNullable<VideoItem['accent']>;
}) {
  const colors = videoAccentClasses[accent];

  return (
    <div
      aria-label="Video thumbnail placeholder. Playback is not available."
      className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${colors.backdrop}`}
      role="img"
    >
      <div
        aria-hidden="true"
        className={`absolute -left-20 top-[18%] h-72 w-72 rounded-full blur-3xl ${colors.glow}`}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_28%,rgba(255,255,255,.18),transparent_38%)]"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-white/15 text-white shadow-xl backdrop-blur-lg"
      >
        <Play className="ml-0.5 h-6 w-6 fill-current" />
      </span>
      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill border border-white/25 bg-black/15 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
        <Sparkles aria-hidden="true" className="h-3 w-3" />
        Preview
      </span>
    </div>
  );
});

export const VideoThumbnail = memo(function VideoThumbnail({
  video,
}: {
  video: VideoItem;
}) {
  const accent = video.accent ?? 'violet';

  return (
    <div
      aria-label={`Video thumbnail for ${video.displayName}. Playback is not available.`}
      className="absolute inset-0 overflow-hidden bg-slate-500"
      role="group"
    >
      {video.thumbnailUrl ? (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          src={video.thumbnailUrl}
        />
      ) : (
        <VideoPlaceholder accent={accent} />
      )}
      <VideoGradient />
    </div>
  );
});

export const VideoLocation = memo(function VideoLocation({
  location = defaultVideoLocation,
}: {
  location?: string;
}) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-white/75">
      <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{location}</span>
    </p>
  );
});

export const VideoLoading = memo(function VideoLoading() {
  return (
    <div
      aria-label="Loading video card preview"
      aria-busy="true"
      className="relative min-h-[min(78svh,52rem)] overflow-hidden bg-surface-raised sm:rounded-[1.65rem]"
      role="status"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-raised via-slate-400/20 to-primary/10 motion-reduce:animate-none" />
      <div className="absolute bottom-8 left-5 right-20 space-y-3">
        <div className="h-4 w-2/5 animate-pulse rounded-full bg-white/25 motion-reduce:animate-none" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-white/20 motion-reduce:animate-none" />
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-white/20 motion-reduce:animate-none" />
      </div>
      <span className="sr-only">Loading video preview</span>
    </div>
  );
});
