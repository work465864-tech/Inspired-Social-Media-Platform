'use client';

import { useState } from 'react';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../../../providers/ToastProvider';
import { getAuthErrorMessage } from '../utils/authErrorMessage';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  const { logout } = useAuth();
  const showToast = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      showToast({
        title: 'Sign out failed',
        description: getAuthErrorMessage(error, 'login'),
        variant: 'error',
      });
      setIsSigningOut(false);
    }
  }

  return (
    <LoadingButton
      loading={isSigningOut}
      loadingLabel="Signing out..."
      onClick={handleSignOut}
      variant="secondary"
    >
      Sign out
    </LoadingButton>
  );
}
