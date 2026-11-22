'use client';

import { memo } from 'react';
import type { VideoItem } from '../types/video';
import {
  VideoAuthor,
  VideoCaption,
  VideoLocation,
  VideoMusic,
  VideoStats,
} from './VideoParts';
import { VideoActions } from './VideoActions';
import type { LikeButtonState } from './VideoActions';

export const VideoOverlay = memo(function VideoOverlay({
  likeButton,
  video,
}: {
  video: VideoItem;
  likeButton: LikeButtonState;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 pb-5 sm:p-5 sm:pb-6 lg:p-6">
      <div className="flex min-h-0 items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3 pr-1 sm:max-w-[min(76%,36rem)]">
          <VideoAuthor video={video} />
          <VideoCaption caption={video.caption} />
          <VideoMusic music={video.music} />
          <VideoLocation location={video.location} />
        </div>
        <div className="shrink-0 pb-1">
          <VideoActions
            commentsCount={video.commentsCount ?? 0}
            likeButton={likeButton}
            stats={video.stats}
            videoAuthor={`@${video.username}`}
            videoCaption={video.caption}
            creatorUsername={video.username}
            videoId={video.id}
          />
          <VideoStats stats={video.stats} />
        </div>
      </div>
    </div>
  );
});
