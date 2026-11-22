'use client';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import Input from '../../../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability';
import { AvatarPicker } from './AvatarPicker';
import { UsernameField } from './UsernameField';
import { fullNameSchema } from '../schemas/authSchemas';
import { profileUpdateSchema } from '../schemas/profileSchemas';
import { uploadAvatar } from '../services/avatarService';
import { checkUsernameAvailability } from '../services/profileService';
import { getAuthErrorMessage } from '../utils/authErrorMessage';
import { useToast } from '../../../providers/ToastProvider';

const steps = ['Welcome', 'Username', 'Photo', 'Bio', 'Finish'] as const;

export function OnboardingScreen() {
  const { completeOnboarding, profile, updateProfile, user, isLoading } =
    useAuth();
  const showToast = useToast();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const usernameAvailability = useUsernameAvailability(username, user?.id);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFullName(profile.full_name);
    setUsername(profile.username);
    setAvatarUrl(profile.avatar_url);
    setBio(profile.bio);
  }, [profile]);

  async function handleNext() {
    if (step === 1) {
      const parsedFullName = fullNameSchema.safeParse(fullName);
      if (!parsedFullName.success) {
        showToast({
          title: 'Add your name',
          description:
            parsedFullName.error.issues[0]?.message ??
            'Enter a valid full name.',
          variant: 'error',
        });
        return;
      }

      if (usernameAvailability.status !== 'available') {
        showToast({
          title: 'Choose an available username',
          description: 'Check the username and try again.',
          variant: 'error',
        });
        return;
      }
    }

    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  }

  async function handleFinish() {
    if (!profile || !user) {
      return;
    }

    const parsedInput = profileUpdateSchema.safeParse({
      avatar_url: avatarUrl,
      bio,
      full_name: fullName,
      username,
      is_private: profile.is_private,
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
      await completeOnboarding();
      setAvatarFile(null);
      showToast({
        title: 'You’re all set',
        description: 'Your profile is ready. Welcome to Connectly.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Could not finish setup',
        description: getAuthErrorMessage(error, 'profile'),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !profile || !user) {
    return (
      <div
        aria-busy="true"
        className="h-[28rem] animate-pulse rounded-card border border-border bg-surface/60"
        role="status"
      >
        <span className="sr-only">Preparing your profile setup</span>
      </div>
    );
  }

  const stepContent = [
    <div
      className="grid justify-items-center gap-5 py-5 text-center"
      key="welcome"
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles aria-hidden="true" className="h-8 w-8" />
      </div>
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome to your corner
        </h2>
        <p className="max-w-md text-sm leading-6 text-muted">
          Let’s make your profile feel like you. This only takes a moment, and
          you can change these details whenever you like.
        </p>
      </div>
    </div>,
    <div className="grid gap-5" key="username">
      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="onboarding-full-name"
        >
          Full name
        </label>
        <Input
          autoComplete="name"
          id="onboarding-full-name"
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
      <p className="text-xs leading-5 text-muted">
        Your username is how friends can find and mention you.
      </p>
    </div>,
    <AvatarPicker
      file={avatarFile}
      imageUrl={avatarUrl}
      key="avatar"
      onClear={() => setAvatarUrl(null)}
      onFileChange={setAvatarFile}
    />,
    <div className="grid gap-3" key="bio">
      <div className="flex items-center justify-between gap-3">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="onboarding-bio"
        >
          A little about you
          <span className="ml-1 font-normal text-muted">· optional</span>
        </label>
        <span className="text-xs tabular-nums text-muted">
          {bio.length}/160
        </span>
      </div>
      <textarea
        className="min-h-36 w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        id="onboarding-bio"
        maxLength={160}
        onChange={(event) => setBio(event.target.value)}
        placeholder="What are you into? What makes you, you?"
        value={bio}
      />
      <p className="text-xs leading-5 text-muted">
        Keep it short and make it yours. You can always add more later.
      </p>
    </div>,
    <div
      className="grid justify-items-center gap-5 py-4 text-center"
      key="finish"
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent">
        <CheckCircle2 aria-hidden="true" className="h-9 w-9" />
      </div>
      <div className="grid justify-items-center gap-3">
        {avatarUrl ? (
          <img
            alt=""
            className="h-20 w-20 rounded-full border border-border object-cover"
            src={avatarUrl}
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-full bg-surface-raised text-muted">
            <UserRound aria-hidden="true" className="h-9 w-9" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
          <p className="mt-1 text-sm text-primary">@{username}</p>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted">
          Your profile is ready. Finish setup and start finding your people.
        </p>
      </div>
    </div>,
  ];

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6">
      <header className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          A fresh start
        </p>
        <h1 className="text-display font-semibold text-foreground">
          Make it yours
        </h1>
      </header>

      <div className="grid gap-5 rounded-card border border-border bg-surface/70 p-5 shadow-soft backdrop-blur-xl sm:p-8">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              Step {step + 1} of {steps.length}
            </p>
            <p className="text-xs text-muted">{steps[step]}</p>
          </div>
          <div
            aria-label={`Step ${step + 1} of ${steps.length}`}
            aria-valuemax={steps.length}
            aria-valuemin={1}
            aria-valuenow={step + 1}
            className="h-1.5 overflow-hidden rounded-pill bg-surface-raised"
            role="progressbar"
          >
            <div
              className="h-full rounded-pill bg-gradient-to-r from-primary to-secondary transition-[width]"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div aria-live="polite" className="min-h-56 content-center">
          {stepContent[step]}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            disabled={step === 0 || isSaving}
            onClick={() =>
              setStep((currentStep) => Math.max(currentStep - 1, 0))
            }
            variant="ghost"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button
              disabled={
                step === 1 &&
                (!fullNameSchema.safeParse(fullName).success ||
                  usernameAvailability.status !== 'available')
              }
              onClick={() => void handleNext()}
            >
              Continue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          ) : (
            <LoadingButton
              loading={isSaving}
              loadingLabel="Finishing setup..."
              onClick={handleFinish}
            >
              Finish setup
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            </LoadingButton>
          )}
        </div>
      </div>
    </section>
  );
}
