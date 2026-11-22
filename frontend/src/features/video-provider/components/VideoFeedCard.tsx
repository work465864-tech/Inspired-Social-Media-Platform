'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Pause, Play, VolumeX } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useVideoAnalyticsTracking } from '../../creator-analytics/hooks/useVideoAnalyticsTracking';
import { paths } from '../../../constants/paths.js';
import type { Video } from '../types';

type VideoFeedCardProps = {
  active: boolean;
  root: HTMLElement | null;
  video: Video;
  onVisibilityChange: (id: string, ratio: number) => void;
};

function VideoFeedCardComponent({
  active,
  root,
  video,
  onVisibilityChange,
}: VideoFeedCardProps) {
  const articleRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [visibleRatio, setVisibleRatio] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const impressionTimer = useRef<number | null>(null);
  const analytics = useVideoAnalyticsTracking({
    creatorId: video.creator.id,
    isDemoContent: video.isDemoContent,
    videoId: video.id,
  });

  useEffect(() => {
    const element = articleRef.current;
    if (!element || !root) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.intersectionRatio ?? 0;
        setVisibleRatio(ratio);
        setIsNearViewport(Boolean(entry?.isIntersecting) && ratio >= 0.1);
        onVisibilityChange(video.id, ratio);
      },
      { root, threshold: [0, 0.1, 0.4, 0.65, 0.85] },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      onVisibilityChange(video.id, 0);
    };
  }, [onVisibilityChange, root, video.id]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    if (active && isNearViewport && !pausedByUser && !playbackFailed) {
      void element.play().then(
        () => setPlaybackFailed(false),
        () => setPlaybackFailed(true),
      );
    } else {
      element.pause();
    }
  }, [active, isNearViewport, pausedByUser, playbackFailed]);

  useEffect(() => {
    if (impressionTimer.current !== null) {
      window.clearTimeout(impressionTimer.current);
      impressionTimer.current = null;
    }
    if (!active || visibleRatio < 0.6) {
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
  }, [active, analytics.trackImpression, visibleRatio]);

  useEffect(
    () => () => {
      if (impressionTimer.current !== null) {
        window.clearTimeout(impressionTimer.current);
      }
    },
    [],
  );

  return (
    <article
      aria-label={`Video: ${video.title}, by ${video.creator.name}`}
      className="relative isolate h-full min-h-0 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl sm:rounded-[1.65rem]"
      ref={articleRef}
    >
      {video.thumbnail && (
        <Image
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          fill
          loading="lazy"
          sizes="(max-width: 640px) 100vw, 560px"
          src={video.thumbnail}
          unoptimized
        />
      )}
      <video
        aria-label={video.title}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted
        playsInline
        preload={isNearViewport ? 'metadata' : 'none'}
        ref={videoRef}
        src={isNearViewport ? video.playbackUrl : undefined}
        onEnded={(event) => analytics.trackMediaElement(event.currentTarget)}
        onError={() => setPlaybackFailed(true)}
        onPause={(event) => analytics.trackMediaElement(event.currentTarget)}
        onPlay={(event) => analytics.trackMediaElement(event.currentTarget)}
        onTimeUpdate={(event) =>
          analytics.trackMediaElement(event.currentTarget)
        }
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20"
      />

      <button
        aria-label={
          pausedByUser || playbackFailed ? 'Play video' : 'Pause video'
        }
        className="absolute left-1/2 top-1/2 z-20 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/35 text-white shadow-xl backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        onClick={() => {
          if (pausedByUser || playbackFailed) {
            setPlaybackFailed(false);
            setPausedByUser(false);
          } else {
            setPausedByUser(true);
          }
        }}
        type="button"
      >
        {pausedByUser || playbackFailed ? (
          <Play aria-hidden="true" className="ml-0.5 h-6 w-6 fill-current" />
        ) : (
          <Pause aria-hidden="true" className="h-6 w-6 fill-current" />
        )}
      </button>

      <div className="absolute bottom-5 left-4 right-16 z-10 space-y-3 sm:bottom-7 sm:left-6">
        <div>
          {video.creator.username ? (
            <Link
              className="inline-flex min-h-8 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              href={paths.creatorProfile(video.creator.username)}
            >
              <span className="text-sm font-bold drop-shadow">
                {video.creator.name}
              </span>
            </Link>
          ) : (
            <p className="text-sm font-bold drop-shadow">
              {video.creator.name}
            </p>
          )}
          <h2 className="mt-1 text-lg font-semibold leading-tight drop-shadow">
            {video.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-white/85 drop-shadow">
            {video.description}
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-white/85">
          <VolumeX aria-hidden="true" className="h-4 w-4" />
          Sound is muted
        </p>
        <a
          className="inline-flex min-h-8 items-center rounded-full border border-white/35 bg-black/25 px-3 text-xs font-semibold text-white backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          href={video.attribution.url}
          rel="noreferrer"
          target="_blank"
        >
          Video via {video.attribution.label}
        </a>
      </div>

      <aside
        aria-label={`${video.likes} likes and ${video.comments} comments`}
        className="absolute bottom-7 right-3 z-10 flex flex-col items-center gap-4 text-xs font-semibold sm:right-5"
      >
        <div className="grid justify-items-center gap-1">
          <Heart aria-hidden="true" className="h-6 w-6 drop-shadow" />
          <span>{video.likes.toLocaleString()}</span>
        </div>
        <div className="grid justify-items-center gap-1">
          <MessageCircle aria-hidden="true" className="h-6 w-6 drop-shadow" />
          <span>{video.comments.toLocaleString()}</span>
        </div>
      </aside>
    </article>
  );
}

export const VideoFeedCard = memo(VideoFeedCardComponent);
VideoFeedCard.displayName = 'VideoFeedCard';
