import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { rolePermissions } from '../constants/rolePermissions';
import type { Permission, UserRole, UserStatus } from '../types/rbac';

export type AuthorizationState = {
  role: UserRole;
  status: UserStatus;
};

export function getPermissions(
  authorization: AuthorizationState | null,
): readonly Permission[] {
  if (!authorization || authorization.status !== 'active') {
    return [];
  }

  return rolePermissions[authorization.role] ?? [];
}

export function can(
  authorization: AuthorizationState | null,
  permission: Permission,
): boolean {
  return getPermissions(authorization).includes(permission);
}

export function canUpload(authorization: AuthorizationState | null): boolean {
  return can(authorization, 'videos:upload');
}

export function canFollowUsers(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'users:follow');
}

export function canDeleteComment(
  authorization: AuthorizationState | null,
  isOwnComment = false,
): boolean {
  return (
    can(authorization, 'comments:delete:any') ||
    (isOwnComment && can(authorization, 'comments:delete:own'))
  );
}

export function canDeleteVideo(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'videos:delete');
}

export function canHideVideo(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'videos:hide');
}

export function canSuspendContent(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'content:suspend');
}

export function canAccessAdmin(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'admin:access');
}

export function canManageUsers(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'users:manage');
}

export function canManageModerators(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'moderators:manage');
}

export function canViewReports(
  authorization: AuthorizationState | null,
): boolean {
  return (
    can(authorization, 'reports:review') || can(authorization, 'reports:manage')
  );
}

export function canEditOwnProfile(
  authorization: AuthorizationState | null,
): boolean {
  return can(authorization, 'profiles:update:own');
}

export async function assertPermission(permission: Permission): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('has_permission', {
    requested_permission: permission,
  });

  if (error) {
    throw error;
  }
  if (data !== true) {
    throw new Error('You are not allowed to perform this action.');
  }
}
