import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import type { UserRole } from '../types/rbac';

type RoleGuardProps = {
  allowedRoles: readonly UserRole[];
  children: ReactNode;
};

function isAuthorization(
  value: unknown,
): value is { role: UserRole; status: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const authorization = value as Record<string, unknown>;
  return (
    typeof authorization.role === 'string' &&
    typeof authorization.status === 'string'
  );
}

export async function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError &&
    userError.name !== 'AuthSessionMissingError' &&
    userError.status !== 401
  ) {
    console.error('Unable to verify the current session:', userError.message);
    throw userError;
  }
  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase.rpc('ensure_my_profile');
  if (error) {
    console.error('Unable to verify the current user role:', error.message);
    throw error;
  }
  if (!isAuthorization(data)) {
    throw new Error('Supabase returned an invalid authorization profile.');
  }
  if (data.status !== 'active' || !allowedRoles.includes(data.role)) {
    redirect('/feed');
  }

  return children;
}
