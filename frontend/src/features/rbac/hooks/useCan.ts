'use client';

import { useAuth } from '../../auth/hooks/useAuth';
import { can, type AuthorizationState } from '../services/permissionService';
import type { Permission } from '../types/rbac';

export function useCan(permission: Permission): boolean {
  const { profile } = useAuth();
  const authorization: AuthorizationState | null = profile
    ? { role: profile.role, status: profile.status }
    : null;

  return can(authorization, permission);
}
