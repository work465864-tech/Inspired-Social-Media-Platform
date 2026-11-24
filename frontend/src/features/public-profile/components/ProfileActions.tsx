'use client';

import { useState } from 'react';
import {
  BarChart3,
  Copy,
  ExternalLink,
  MessageCircle,
  Settings2,
  Share2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { paths } from '../../../constants/paths.js';
import { FollowButton } from '../../follows/components/FollowButton';

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export function ProfileActions({
  isOwner,
  profileId,
  username,
}: {
  isOwner: boolean;
  profileId: string;
  username: string;
}) {
  const [shareMessage, setShareMessage] = useState('');

  async function shareProfile() {
    const url = `${window.location.origin}${paths.creatorProfile(username)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `@${username} on Connectly`, url });
        setShareMessage('Profile shared.');
        return;
      }
      if (!navigator.clipboard) {
        setShareMessage('Sharing is not supported by this browser.');
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage('Profile link copied.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setShareMessage(
        error instanceof Error
          ? `Could not share profile: ${error.message}`
          : 'Could not share this profile.',
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwner ? (
        <>
          <Link className={buttonClass} href={paths.profileSettings}>
            <Settings2 aria-hidden="true" className="h-4 w-4" />
            Edit profile
          </Link>
          <Link className={buttonClass} href={paths.upload}>
            <Upload aria-hidden="true" className="h-4 w-4" />
            Upload video
          </Link>
          <Link className={buttonClass} href={paths.creatorStudio}>
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
            Creator Studio
          </Link>
        </>
      ) : (
        <>
          <FollowButton targetUserId={profileId} />
          <button
            aria-disabled="true"
            className={`${buttonClass} cursor-not-allowed opacity-60`}
            disabled
            title="Messaging is coming soon."
            type="button"
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            Message
            <span className="sr-only">Coming soon</span>
          </button>
        </>
      )}
      <button
        className={buttonClass}
        onClick={() => void shareProfile()}
        type="button"
      >
        {shareMessage === 'Profile link copied.' ? (
          <Copy aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Share2 aria-hidden="true" className="h-4 w-4" />
        )}
        Share profile
        <ExternalLink aria-hidden="true" className="sr-only" />
      </button>
      <span aria-live="polite" className="sr-only" role="status">
        {shareMessage}
      </span>
    </div>
  );
}
