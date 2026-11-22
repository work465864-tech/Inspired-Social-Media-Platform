'use client';

import type { ReactNode } from 'react';
import { useCan } from '../hooks/useCan';
import type { Permission } from '../types/rbac';

type CanProps = {
  children: ReactNode;
  fallback?: ReactNode;
  permission: Permission;
};

export function Can({ children, fallback = null, permission }: CanProps) {
  return useCan(permission) ? children : fallback;
}
