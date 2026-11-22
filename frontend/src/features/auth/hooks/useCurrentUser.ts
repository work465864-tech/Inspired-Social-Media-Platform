'use client';

import { useAuth } from './useAuth';

export function useCurrentUser() {
  return useAuth().user;
}
