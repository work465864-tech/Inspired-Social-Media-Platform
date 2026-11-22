'use client';

import { useAuth } from '../../auth/hooks/useAuth';

export function useRole() {
  return useAuth().profile?.role ?? null;
}
