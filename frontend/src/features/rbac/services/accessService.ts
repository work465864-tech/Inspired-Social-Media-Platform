import { z } from 'zod';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { assertPermission } from './permissionService';
import type { UserRole, KnownUserStatus } from '../types/rbac';

const userAccessInputSchema = z.object({
  userId: z.string().uuid(),
  role: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{0,63}$/),
  status: z.enum(['active', 'suspended', 'banned']),
  isVerified: z.boolean(),
});

export type UserAccessInput = {
  userId: string;
  role: UserRole;
  status: KnownUserStatus;
  isVerified: boolean;
};

export type UserAccessResult = {
  id: string;
  role: UserRole;
  status: KnownUserStatus;
  is_verified: boolean;
};

function isUserAccessResult(value: unknown): value is UserAccessResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;
  return (
    typeof result.id === 'string' &&
    typeof result.role === 'string' &&
    typeof result.status === 'string' &&
    ['active', 'suspended', 'banned'].includes(result.status) &&
    typeof result.is_verified === 'boolean'
  );
}

export async function updateUserAccess(
  input: UserAccessInput,
): Promise<UserAccessResult> {
  const accessInput = userAccessInputSchema.parse(input);
  await assertPermission('users:manage');

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('set_profile_access', {
    target_user_id: accessInput.userId,
    target_role: accessInput.role,
    target_status: accessInput.status,
    target_is_verified: accessInput.isVerified,
  });

  if (error) {
    throw error;
  }
  if (!isUserAccessResult(data) || data.id !== accessInput.userId) {
    throw new Error('Supabase returned an invalid user access result.');
  }

  return data;
}
