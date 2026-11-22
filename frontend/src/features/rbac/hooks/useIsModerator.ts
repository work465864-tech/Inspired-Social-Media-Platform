'use client';

import { useAuth } from '../../auth/hooks/useAuth';

export function useIsModerator(): boolean {
  const { profile } = useAuth();
  return (
    profile?.status === 'active' &&
    (profile.role === 'moderator' || profile.role === 'admin')
  );
}
