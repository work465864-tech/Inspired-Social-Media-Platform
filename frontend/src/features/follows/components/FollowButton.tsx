'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { paths } from '../../../constants/paths.js';
import { useAuth } from '../../auth/hooks/useAuth';
import { useFollow } from '../hooks/useFollow';

export function FollowButton({
  compact = false,
  targetUserId,
}: {
  compact?: boolean;
  targetUserId: string;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const follow = useFollow(targetUserId);

  if (user?.id === targetUserId) {
    return null;
  }

  const buttonClass = compact
    ? 'min-h-8 rounded-full border border-white/60 bg-black/25 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60'
    : 'min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  if (follow.isLoading || isAuthLoading) {
    return (
      <button className={buttonClass} disabled type="button">
        Loading…
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        className={`${buttonClass} inline-flex items-center justify-center`}
        href={paths.login}
      >
        Sign in to follow
      </Link>
    );
  }

  if (follow.isQueryError) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          className={buttonClass}
          onClick={() => void follow.refetch()}
          type="button"
        >
          Retry follow status
        </button>
        <p
          aria-live="polite"
          className="max-w-64 text-xs text-red-500"
          role="alert"
        >
          {follow.error instanceof Error
            ? follow.error.message
            : 'Follow status could not be loaded.'}
        </p>
      </div>
    );
  }

  const label = follow.isUpdating
    ? 'Updating…'
    : follow.status === 'accepted'
      ? 'Following'
      : follow.status === 'pending'
        ? 'Requested'
        : 'Follow';

  return (
    <>
      <button
        aria-label={`${label} creator`}
        aria-pressed={follow.status !== null && follow.status !== undefined}
        className={buttonClass}
        disabled={follow.isLoading || follow.isUpdating}
        onClick={() => {
          follow.toggle(undefined, {
            onSuccess: () => router.refresh(),
          });
        }}
        type="button"
      >
        {label}
      </button>
      {follow.error && (
        <p
          aria-live="polite"
          className="mt-1 max-w-64 text-xs text-red-500"
          role="alert"
        >
          {follow.error instanceof Error
            ? follow.error.message
            : 'The follow request could not be completed.'}
        </p>
      )}
    </>
  );
}
