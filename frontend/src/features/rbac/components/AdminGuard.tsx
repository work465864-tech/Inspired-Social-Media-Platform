import type { ReactNode } from 'react';
import { RoleGuard } from './RoleGuard';

type AdminGuardProps = {
  children: ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  return <RoleGuard allowedRoles={['admin']}>{children}</RoleGuard>;
}
