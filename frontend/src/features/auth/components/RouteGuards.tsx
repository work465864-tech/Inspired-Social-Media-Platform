'use client';

import { LoaderCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../../../providers/ToastProvider';
import { useAccountSecurityPolicy } from '../../security/hooks/useAccountSecurityPolicy';

type GuardProps = {
  children: ReactNode;
};

function RouteLoadingState() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[90] grid place-items-center bg-canvas/75 backdrop-blur-sm"
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-8 w-8 animate-spin text-primary"
      />
      <span className="sr-only">Checking your access</span>
    </div>
  );
}

export function AuthGuard({ children }: GuardProps) {
  const { isLoading, logout, profile, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const showToast = useToast();
  const { requireVerifiedEmail } = useAccountSecurityPolicy();
  const isPublicHome = pathname === '/';
  const isRestricted =
    profile?.status === 'suspended' || profile?.status === 'banned';
  const requiresEmailVerification =
    !isPublicHome && requireVerifiedEmail && !user?.email_confirmed_at;

  useEffect(() => {
    if (
      !isLoading &&
      user &&
      requiresEmailVerification &&
      pathname !== '/verify-email'
    ) {
      router.replace('/verify-email');
      return;
    }
    if (!isLoading && !user && !isPublicHome) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [
    isLoading,
    isPublicHome,
    pathname,
    requiresEmailVerification,
    router,
    user,
  ]);

  if (isPublicHome) {
    return children;
  }

  if (isLoading || !user) {
    return <RouteLoadingState />;
  }
  if (requiresEmailVerification && pathname !== '/verify-email') {
    return <RouteLoadingState />;
  }

  if (!profile || isRestricted) {
    return (
      <main
        aria-live="polite"
        className="grid min-h-screen place-items-center bg-canvas px-6"
      >
        <section className="grid max-w-md gap-4 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            {!profile
              ? 'Account verification unavailable'
              : 'Account unavailable'}
          </h1>
          <p className="text-sm leading-6 text-muted">
            {!profile
              ? 'We could not verify your account. Please try again later.'
              : profile.status === 'suspended'
                ? 'This account is temporarily suspended. Contact support if you need help.'
                : 'This account is unavailable. Contact support if you believe this is a mistake.'}
          </p>
          <button
            className="min-h-11 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => {
              void logout().catch(() => {
                showToast({
                  title: 'Sign out failed',
                  description: 'Please try again.',
                  variant: 'error',
                });
              });
            }}
            type="button"
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return children;
}

export function GuestGuard({ children }: GuardProps) {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const { requireVerifiedEmail } = useAccountSecurityPolicy();
  const requiresEmailVerification =
    requireVerifiedEmail && !user?.email_confirmed_at;

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(requiresEmailVerification ? '/verify-email' : '/feed');
    }
  }, [isLoading, requiresEmailVerification, router, user]);

  if (isLoading || user) {
    return <RouteLoadingState />;
  }

  return children;
}
