import type { ReactNode } from 'react';
import { RoleGuard } from './RoleGuard';

type ModeratorGuardProps = {
  children: ReactNode;
};

export function ModeratorGuard({ children }: ModeratorGuardProps) {
  return (
    <RoleGuard allowedRoles={['moderator', 'admin']}>{children}</RoleGuard>
  );
}
