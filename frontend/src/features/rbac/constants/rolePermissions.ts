import type { KnownUserRole, Permission, RoleMap } from '../types/rbac';
import { allPermissions } from '../types/rbac';

const userPermissions = [
  'videos:upload',
  'comments:create',
  'comments:delete:own',
  'users:follow',
  'profiles:update:own',
] as const satisfies readonly Permission[];

const moderatorPermissions = [
  ...userPermissions,
  'comments:delete:any',
  'reports:review',
  'videos:hide',
  'content:suspend',
] as const satisfies readonly Permission[];

export const rolePermissions: RoleMap = {
  user: userPermissions,
  moderator: moderatorPermissions,
  admin: allPermissions,
} satisfies Record<KnownUserRole, readonly Permission[]>;
