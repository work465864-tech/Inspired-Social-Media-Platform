import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Tables } from '../../../types/database.types';
import { FeedDataError, withTimedRequest } from './errorService';
import type { Profile } from '../types/models';

type ProfileRow = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'username'
  | 'full_name'
  | 'avatar_url'
  | 'is_verified'
  | 'is_private'
  | 'created_at'
>;

const profileColumns =
  'id,username,full_name,avatar_url,is_verified,is_private,created_at';

function isProfileRow(value: unknown): value is ProfileRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.username === 'string' &&
    typeof row.full_name === 'string' &&
    (typeof row.avatar_url === 'string' || row.avatar_url === null) &&
    typeof row.is_verified === 'boolean' &&
    typeof row.is_private === 'boolean' &&
    typeof row.created_at === 'string'
  );
}

export function mapProfile(value: unknown): Profile {
  if (!isProfileRow(value)) {
    throw new FeedDataError(
      'invalid_data',
      'The profile response has an unexpected shape.',
    );
  }

  return {
    id: value.id,
    username: value.username,
    displayName: value.full_name.trim() || value.username,
    avatarUrl: value.avatar_url,
    isVerified: value.is_verified,
    isPrivate: value.is_private,
    createdAt: value.created_at,
  };
}

export const profileService = {
  async getById(
    profileId: string,
    signal: AbortSignal,
  ): Promise<Profile | null> {
    const supabase = createSupabaseBrowserClient();
    const data = await withTimedRequest(
      signal,
      15_000,
      async (requestSignal) => {
        const { data: row, error } = await supabase
          .from('profiles')
          .select(profileColumns)
          .eq('id', profileId)
          .abortSignal(requestSignal)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return row;
      },
    );

    return data === null ? null : mapProfile(data);
  },

  map: mapProfile,
};
