export type KnownUserRole = 'user' | 'moderator' | 'admin';
export type UserRole = KnownUserRole | (string & {});

export type KnownUserStatus = 'active' | 'suspended' | 'banned';
export type UserStatus = KnownUserStatus | (string & {});

export const allPermissions = [
  'videos:upload',
  'comments:create',
  'comments:delete:any',
  'comments:delete:own',
  'users:follow',
  'profiles:update:own',
  'reports:review',
  'videos:hide',
  'content:suspend',
  'videos:delete',
  'admin:access',
  'users:manage',
  'moderators:manage',
  'reports:manage',
  'categories:manage',
  'platform:settings:manage',
  'users:verify',
] as const;

export type Permission = (typeof allPermissions)[number];

export type RoleMap = Readonly<Record<string, readonly Permission[]>>;
