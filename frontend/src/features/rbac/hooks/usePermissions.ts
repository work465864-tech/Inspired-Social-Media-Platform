'use client';

import { useAuth } from '../../auth/hooks/useAuth';
import {
  getPermissions,
  type AuthorizationState,
} from '../services/permissionService';

export function usePermissions() {
  const { profile } = useAuth();
  const authorization: AuthorizationState | null = profile
    ? { role: profile.role, status: profile.status }
    : null;

  return getPermissions(authorization);
}
