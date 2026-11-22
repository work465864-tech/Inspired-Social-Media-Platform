import Image from 'next/image';
import { BadgeCheck, Heart, LockKeyhole, Play, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/display/Avatar';
import type { PublicCreatorProfileData } from '../types';
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

export function PublicCreatorProfile({
  profile,
}: {
  profile: PublicCreatorProfileData;
}) {
  const hasHiddenPrivatePosts =
    profile.isPrivate &&
    profile.videosCount === 0 &&
    profile.videos.length === 0;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 pb-10">
      <ProfileVisitTracker profileId={profile.id} />
      <header className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            alt={`${profile.fullName}'s avatar`}
            className="h-24 w-24 shrink-0 sm:h-32 sm:w-32"
            name={profile.fullName}
            size="xl"
            src={profile.avatarUrl}
          />
          <div className="min-w-0 flex-1">
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
            {profile.bio && (
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-foreground">
                {profile.bio}
              </p>
            )}
            <div
              aria-label="Creator statistics"
              className="mt-5 flex flex-wrap gap-x-7 gap-y-4"
            >
              <Stat label="Followers" value={profile.followersCount} />
              <Stat label="Following" value={profile.followingCount} />
              <Stat label="Videos" value={profile.videosCount} />
              <Stat label="Likes" value={profile.likesCount} />
            </div>
          </div>
        </div>
      </header>

      <PublicProfileTabs />

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
      ) : profile.videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <Play aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            No videos yet
          </h2>
          <p className="mt-1 text-sm text-muted">
            Videos shared by this creator will appear here.
          </p>
        </div>
      ) : (
        <ul
          aria-label={`Videos by ${profile.fullName}`}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        >
          {profile.videos.map((video) => (
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
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
                    <Heart aria-hidden="true" className="h-3.5 w-3.5" />
                    {compactNumber.format(video.likesCount)}
                  </span>
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
                    <UsersRound aria-hidden="true" className="h-3.5 w-3.5" />
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
    </section>
  );
}
