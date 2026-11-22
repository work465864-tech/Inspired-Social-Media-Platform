'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import Badge from '../../../components/ui/Badge.jsx';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import Input from '../../../components/ui/Input';
import { AvatarPicker } from './AvatarPicker';
import { UsernameField } from './UsernameField';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../../../providers/ToastProvider';
import { checkUsernameAvailability } from '../services/profileService';
import { uploadAvatar } from '../services/avatarService';
import { profileUpdateSchema } from '../schemas/profileSchemas';
import { getAuthErrorMessage } from '../utils/authErrorMessage';
import { useCan } from '../../rbac/hooks/useCan';
import { paths } from '../../../constants/paths.js';

export function ProfileEditor() {
  const { profile, updateProfile, user } = useAuth();
  const canEditProfile = useCan('profiles:update:own');
  const showToast = useToast();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFullName(profile.full_name);
    setUsername(profile.username);
    setBio(profile.bio);
    setAvatarUrl(profile.avatar_url);
    setIsPrivate(profile.is_private);
  }, [profile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !user) {
      return;
    }

    const parsedInput = profileUpdateSchema.safeParse({
      avatar_url: avatarUrl,
      bio,
      full_name: fullName,
      username,
      is_private: isPrivate,
    });
    if (!parsedInput.success) {
      showToast({
        title: 'Check your profile details',
        description:
          parsedInput.error.issues[0]?.message ??
          'Review the information and try again.',
        variant: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      const availability = await checkUsernameAvailability(
        parsedInput.data.username,
        user.id,
      );
      if (!availability.available) {
        throw new Error('Username is already taken.');
      }

      let nextAvatarUrl = parsedInput.data.avatar_url;
      if (avatarFile) {
        const uploadedAvatar = await uploadAvatar(user.id, avatarFile);
        nextAvatarUrl = uploadedAvatar.url;
      }

      await updateProfile({
        ...parsedInput.data,
        avatar_url: nextAvatarUrl,
      });
      setAvatarFile(null);
      setAvatarUrl(nextAvatarUrl);
      showToast({
        title: 'Profile updated',
        description: 'Your changes are saved.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Profile update failed',
        description: getAuthErrorMessage(error, 'profile'),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!profile || !user) {
    return (
      <div
        aria-busy="true"
        className="h-56 animate-pulse rounded-card border border-border bg-surface/60"
        role="status"
      >
        <span className="sr-only">Loading your profile</span>
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Your space
        </p>
        <h1 className="text-display font-semibold text-foreground">
          Profile settings
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Make your corner feel like you. Your profile helps people find and
          recognize you.
        </p>
        <Link
          className="inline-flex min-h-10 w-fit items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href={paths.creatorProfile(profile.username)}
        >
          View public profile
        </Link>
        <div className="flex flex-wrap gap-2">
          {profile.is_verified && (
            <Badge className="inline-flex items-center gap-1">
              <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Verified
            </Badge>
          )}
          {profile.role !== 'user' && (
            <Badge>
              {profile.role[0]?.toUpperCase()}
              {profile.role.slice(1)}
            </Badge>
          )}
          {profile.status !== 'active' && (
            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">
              {profile.status[0]?.toUpperCase()}
              {profile.status.slice(1)}
            </Badge>
          )}
        </div>
      </header>

      <form
        className="grid gap-6 rounded-card border border-border bg-surface/70 p-5 shadow-soft backdrop-blur-xl sm:p-7"
        onSubmit={handleSubmit}
      >
        {!canEditProfile && (
          <p className="rounded-control bg-surface-raised px-4 py-3 text-sm text-muted">
            Profile editing is unavailable while this account is restricted.
          </p>
        )}
        <fieldset
          className="grid gap-6 border-0 p-0"
          disabled={!canEditProfile || isSaving}
        >
          <AvatarPicker
            file={avatarFile}
            imageUrl={avatarUrl}
            onClear={() => setAvatarUrl(null)}
            onFileChange={setAvatarFile}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="profile-full-name"
              >
                Full name
              </label>
              <Input
                autoComplete="name"
                id="profile-full-name"
                maxLength={80}
                onChange={(event) => setFullName(event.target.value)}
                value={fullName}
              />
            </div>
            <UsernameField
              currentUserId={user.id}
              onChange={setUsername}
              value={username}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="profile-bio"
              >
                Bio <span className="font-normal text-muted">· optional</span>
              </label>
              <span className="text-xs tabular-nums text-muted">
                {bio.length}/160
              </span>
            </div>
            <textarea
              className="min-h-28 w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="profile-bio"
              maxLength={160}
              onChange={(event) => setBio(event.target.value)}
              placeholder="A little about you…"
              value={bio}
            />
          </div>

          <label
            className="flex cursor-pointer items-start gap-3 rounded-control border border-border bg-surface-raised/50 p-4"
            htmlFor="profile-private"
          >
            <input
              checked={isPrivate}
              className="mt-1 h-4 w-4 accent-primary"
              id="profile-private"
              onChange={(event) => setIsPrivate(event.target.checked)}
              type="checkbox"
            />
            <span className="grid gap-1">
              <span className="text-sm font-medium text-foreground">
                Private account
              </span>
              <span className="text-xs leading-5 text-muted">
                Limit who can view your posts and follow you.
              </span>
            </span>
          </label>

          <div className="flex justify-end border-t border-border pt-5">
            <LoadingButton
              loading={isSaving}
              loadingLabel="Saving profile..."
              disabled={!canEditProfile}
              type="submit"
            >
              Save changes
            </LoadingButton>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
