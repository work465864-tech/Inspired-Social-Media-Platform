'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAccountSecurityPolicy } from '../../security/hooks/useAccountSecurityPolicy';

export function ProfileOnboardingRedirect() {
  const { isAuthenticated, isFirstLogin, isLoading, isProfileComplete, user } =
    useAuth();
  const { requireVerifiedEmail } = useAccountSecurityPolicy();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      (requireVerifiedEmail && !user?.email_confirmed_at)
    ) {
      return;
    }

    if (
      isFirstLogin &&
      pathname !== '/onboarding' &&
      pathname !== '/reset-password'
    ) {
      router.replace('/onboarding');
      return;
    }

    if (pathname === '/onboarding' && isProfileComplete) {
      router.replace('/feed');
    }
  }, [
    isAuthenticated,
    isFirstLogin,
    isLoading,
    isProfileComplete,
    pathname,
    requireVerifiedEmail,
    router,
    user?.email_confirmed_at,
  ]);

  return null;
}
