import { BadgeCheck, LockKeyhole, Video } from 'lucide-react';
import { memo } from 'react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/display/Avatar';
import { paths } from '../../../constants/paths.js';
import type { Profile } from '../../feed/types/models';

type CreatorCardProps = {
  profile: Profile;
  videosCount?: number;
  viewsCount?: number;
  label?: string;
};

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function CreatorCardComponent({
  profile,
  videosCount,
  viewsCount,
  label,
}: CreatorCardProps) {
  return (
    <Link
      className="block min-w-[15rem] rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-0"
      href={paths.creatorProfile(profile.username)}
    >
      <article className="flex items-center gap-3">
        <Avatar
          alt={profile.displayName}
          className="h-12 w-12"
          name={profile.displayName}
          size="lg"
          src={profile.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {profile.displayName}
            </h3>
            {profile.isVerified && (
              <BadgeCheck
                aria-label="Verified creator"
                className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                role="img"
              />
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            @{profile.username}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            {profile.isPrivate ? (
              <>
                <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                Private creator
              </>
            ) : (
              <>
                <Video aria-hidden="true" className="h-3.5 w-3.5" />
                {videosCount === undefined
                  ? (label ?? 'Creator')
                  : `${videosCount} recent videos`}
                {viewsCount !== undefined &&
                  ` · ${compactNumber.format(viewsCount)} views`}
              </>
            )}
          </p>
        </div>
      </article>
    </Link>
  );
}

export const CreatorCard = memo(CreatorCardComponent);
CreatorCard.displayName = 'CreatorCard';
