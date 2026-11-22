import 'server-only';

import { createSupabaseServerClient } from '../../../lib/supabase/server';
import type { SessionValidationResult } from '../types/security';
import { isInvalidSessionError } from '../utils/isInvalidSessionError';

export async function validateServerSession(): Promise<SessionValidationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isInvalidSessionError(error)) {
      return { authenticated: false, reason: 'invalid' };
    }
    throw error;
  }
  if (!user) {
    return { authenticated: false, reason: 'missing' };
  }

  const { data: rawProfile, error: profileError } =
    await supabase.rpc('ensure_my_profile');
  if (profileError) {
    throw profileError;
  }
  if (
    typeof rawProfile !== 'object' ||
    rawProfile === null ||
    !('id' in rawProfile) ||
    rawProfile.id !== user.id ||
    !('status' in rawProfile) ||
    typeof rawProfile.status !== 'string'
  ) {
    throw new Error('Supabase returned an invalid session profile.');
  }
  if (rawProfile.status !== 'active') {
    if (rawProfile.status === 'suspended' || rawProfile.status === 'banned') {
      return {
        authenticated: false,
        reason: 'restricted',
        status: rawProfile.status,
      };
    }
    throw new Error('Supabase returned an unknown account status.');
  }

  return { authenticated: true, userId: user.id };
}
