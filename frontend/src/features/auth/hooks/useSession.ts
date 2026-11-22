'use client';

import { useAuth } from './useAuth';

export function useSession() {
  return useAuth().session;
}
