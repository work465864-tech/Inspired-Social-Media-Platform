import { BadgeCheck, LockKeyhole, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/display/Avatar';
import { paths } from '../../../constants/paths.js';
import type { SearchUser } from '../types';

type UserResultCardProps = {
  user: SearchUser;
};

export function UserResultCard({ user }: UserResultCardProps) {
  return (
    <Link
      className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      href={paths.creatorProfile(user.username)}
    >
      <article className="flex items-center gap-4">
        <Avatar
          alt={user.displayName}
          className="h-14 w-14"
          name={user.displayName}
          size="lg"
          src={user.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {user.displayName}
            </h2>
            {user.isVerified && (
              <BadgeCheck
                aria-label="Verified creator"
                className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                role="img"
              />
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">
              {user.bio}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
          {user.isPrivate ? (
            <>
              <LockKeyhole aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Private</span>
            </>
          ) : (
            <>
              <UsersRound aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Creator</span>
            </>
          )}
        </div>
      </article>
    </Link>
  );
}
