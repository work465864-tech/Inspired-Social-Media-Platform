import Image from 'next/image';
import {
  BadgeCheck,
  CalendarDays,
  Eye,
  Heart,
  LockKeyhole,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/display/Avatar';
import { paths } from '../../../constants/paths.js';
import type { PublicCreatorProfileData } from '../types';
import { ProfileActions } from './ProfileActions';
import { ProfileVisitTracker } from './ProfileVisitTracker';
import { PublicProfileTabs } from './PublicProfileTabs';

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20">
      <p className="text-lg font-bold text-foreground">
        {compactNumber.format(value)}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function formatDuration(durationMs: number | null): string | null {
  if (!durationMs || durationMs <= 0) {
    return null;
  }
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function PublicCreatorProfile({
  profile,
  activeTab,
}: {
  profile: PublicCreatorProfileData;
  activeTab: 'videos' | 'reposts' | 'likes';
}) {
  const hasHiddenPrivatePosts =
    profile.isPrivate && !profile.canViewPrivateProfile;
  const displayedVideos =
    activeTab === 'likes' ? profile.likedVideos : profile.videos;
  const hasMoreVideos =
    activeTab === 'likes' ? profile.hasMoreLikedVideos : profile.hasMoreVideos;
  const joinDate = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.joinedAt));

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 pb-10">
      <ProfileVisitTracker profileId={profile.id} />
      <header className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 sm:h-44">
          {profile.coverImageUrl && (
            <Image
              alt=""
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 960px"
              src={profile.coverImageUrl}
              unoptimized
            />
          )}
        </div>
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end">
            <Avatar
              alt={`${profile.fullName}'s avatar`}
              className="h-24 w-24 shrink-0 border-4 border-surface sm:h-28 sm:w-28"
              name={profile.fullName}
              size="xl"
              src={profile.avatarUrl}
            />
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {profile.fullName}
                </h1>
                {profile.isVerified && (
                  <BadgeCheck
                    aria-label="Verified creator"
                    className="h-5 w-5 fill-primary text-primary-foreground"
                    role="img"
                  />
                )}
                {profile.isPrivate && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                    <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                    Private
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">@{profile.username}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-5">
            {profile.bio && (
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-6 text-foreground">
                {profile.bio}
              </p>
            )}
            {profile.websiteUrl && (
              <a
                className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={profile.websiteUrl}
                rel="noreferrer"
                target="_blank"
              >
                {profile.websiteUrl}
              </a>
            )}
            <div
              aria-label="Creator statistics"
              className="flex flex-wrap gap-x-7 gap-y-4"
            >
              <Stat label="Followers" value={profile.followersCount} />
              <Stat label="Following" value={profile.followingCount} />
              <Stat label="Likes" value={profile.likesCount} />
              <Stat label="Videos" value={profile.videosCount} />
              <Stat label="Views" value={profile.viewsCount} />
              <p className="inline-flex items-center gap-2 text-xs text-muted">
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                Joined {joinDate}
              </p>
            </div>
            <ProfileActions
              isOwner={profile.isOwner}
              profileId={profile.id}
              username={profile.username}
            />
          </div>
        </div>
      </header>

      <PublicProfileTabs
        activeTab={activeTab}
        isOwner={profile.isOwner}
        username={profile.username}
      />

      {hasHiddenPrivatePosts ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <LockKeyhole
            aria-hidden="true"
            className="mx-auto h-7 w-7 text-muted"
          />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            This creator has no videos available to you
          </h2>
          <p className="mt-1 text-sm text-muted">
            Videos from private accounts are only visible to approved followers.
          </p>
        </div>
      ) : activeTab === 'reposts' ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <Play aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            Reposts are coming soon
          </h2>
        </div>
      ) : activeTab === 'likes' && profile.likedVideos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <Heart aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            No liked videos yet
          </h2>
          <p className="mt-1 text-sm text-muted">
            Videos you like will appear here.
          </p>
        </div>
      ) : activeTab === 'videos' && profile.videosCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <Play aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            {profile.isOwner
              ? 'Your story starts with a video'
              : 'No videos yet'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {profile.isOwner
              ? 'Upload your first video and it will appear on your profile.'
              : 'Videos shared by this creator will appear here.'}
          </p>
          {profile.isOwner && (
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              href={paths.upload}
            >
              Upload your first video
            </Link>
          )}
        </div>
      ) : (
        <ul
          aria-label={`Videos by ${profile.fullName}`}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        >
          {displayedVideos.map((video) => (
            <li key={video.id}>
              <Link
                className="group block overflow-hidden rounded-2xl border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href={`/watch/${video.id}`}
              >
                <div className="relative aspect-[9/14] bg-surface-raised">
                  {video.thumbnailUrl ? (
                    <Image
                      alt=""
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      src={video.thumbnailUrl}
                      unoptimized
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted">
                      <Play aria-hidden="true" className="h-8 w-8" />
                    </div>
                  )}
                  {formatDuration(video.durationMs) && (
                    <span className="absolute right-2 top-2 rounded bg-black/65 px-2 py-1 text-xs font-medium tabular-nums text-white">
                      {formatDuration(video.durationMs)}
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
                    <Heart aria-hidden="true" className="h-3.5 w-3.5" />
                    {compactNumber.format(video.likesCount)}
                  </span>
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
                    <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                    {compactNumber.format(video.viewsCount)}
                  </span>
                </div>
                <p className="line-clamp-2 px-3 py-2 text-sm font-medium text-foreground">
                  {video.title || video.caption || 'Untitled video'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!hasHiddenPrivatePosts &&
        (activeTab === 'videos' || activeTab === 'likes') &&
        displayedVideos.length > 0 && (
          <nav
            aria-label={
              activeTab === 'likes'
                ? 'Liked video pages'
                : 'Profile video pages'
            }
            className="flex items-center justify-center gap-3"
          >
            {profile.page > 1 && (
              <Link
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
                href={`/profile/${encodeURIComponent(profile.username)}?page=${profile.page - 1}${activeTab === 'likes' ? '&tab=likes' : ''}`}
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-muted">Page {profile.page}</span>
            {hasMoreVideos && (
              <Link
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
                href={`/profile/${encodeURIComponent(profile.username)}?page=${profile.page + 1}${activeTab === 'likes' ? '&tab=likes' : ''}`}
              >
                More videos
              </Link>
            )}
          </nav>
        )}
    </section>
  );
}
