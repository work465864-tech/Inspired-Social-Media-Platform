'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Music2 } from 'lucide-react';
import { paths } from '../../../constants/paths.js';
import { FollowButton } from '../../follows/components/FollowButton';
import type { Video } from '../types';

export function VideoDescription({ video }: { video: Video }) {
  const hashtags = video.description
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
  const creatorContent = (
    <>
      {video.creator.avatarUrl ? (
        <Image
          alt=""
          className="h-10 w-10 rounded-full border border-white/60 object-cover"
          height={40}
          loading="lazy"
          src={video.creator.avatarUrl}
          unoptimized
          width={40}
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-white/15 text-sm font-bold"
        >
          {video.creator.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-bold drop-shadow">
          {video.creator.name}
        </span>
        <span className="block text-[0.6875rem] text-white/75">Creator</span>
      </span>
    </>
  );

  return (
    <div className="min-w-0 space-y-3 text-white">
      <div className="flex items-center justify-between gap-2">
        {video.creator.username ? (
          <Link
            className="inline-flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            href={paths.creatorProfile(video.creator.username)}
          >
            {creatorContent}
          </Link>
        ) : (
          <div className="inline-flex min-w-0 items-center gap-2.5">
            {creatorContent}
          </div>
        )}
        {!video.isDemoContent && video.creator.id && (
          <FollowButton compact targetUserId={video.creator.id} />
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold leading-snug drop-shadow sm:text-lg">
          {video.title}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/85 drop-shadow">
          {video.description}
        </p>
        {hashtags.length > 0 && (
          <ul
            aria-label="Video hashtags"
            className="mt-2 flex flex-wrap gap-x-2 gap-y-1"
          >
            {hashtags.map((tag) => (
              <li className="text-xs font-semibold text-white" key={tag}>
                #{tag.replace(/\s+/g, '')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs font-medium text-white/85">
        <Music2 aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="truncate">Audio details unavailable</span>
      </p>
    </div>
  );
}
