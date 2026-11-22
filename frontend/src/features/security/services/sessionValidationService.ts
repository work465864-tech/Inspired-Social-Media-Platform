import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Profile } from '../../auth/types/profile';
import type { SessionValidationResult } from '../types/security';
import { isInvalidSessionError } from '../utils/isInvalidSessionError';

function isProfile(value: unknown): value is Pick<Profile, 'id' | 'status'> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const profile = value as Record<string, unknown>;
  return typeof profile.id === 'string' && typeof profile.status === 'string';
}

export async function validateBrowserSession(): Promise<SessionValidationResult> {
  const supabase = createSupabaseBrowserClient();
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
  if (!isProfile(rawProfile) || rawProfile.id !== user.id) {
    throw new Error('Supabase returned an invalid session profile.');
  }
  if (rawProfile.status !== 'active') {
    if (rawProfile.status === 'suspended' || rawProfile.status === 'banned') {
      return {
        authenticated: false,
        reason: 'restricted',
        status: rawProfile.status === 'suspended' ? 'suspended' : 'banned',
      };
    }
    throw new Error('Supabase returned an unknown account status.');
  }

  return { authenticated: true, userId: user.id };
}
