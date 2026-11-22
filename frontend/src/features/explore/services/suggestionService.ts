import type { Tables } from '../../../types/database.types';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { normalizeFeedError } from '../../feed/services/errorService';
import type { Profile } from '../../feed/types/models';

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
type FollowRow = Pick<Tables<'follows'>, 'following_id'>;

const candidateLimit = 48;
const suggestedAccountLimit = 8;

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.full_name.trim() || row.username,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    isPrivate: row.is_private,
    createdAt: row.created_at,
  };
}

export class SuggestionService {
  async getSuggestedAccounts(
    userId: string,
    signal: AbortSignal,
  ): Promise<Profile[]> {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: followingRows, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted')
        .abortSignal(signal)
        .returns<FollowRow[]>();
      if (followError) {
        throw followError;
      }

      const followingIds = new Set(
        (followingRows ?? []).map((row) => row.following_id),
      );
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id,username,full_name,avatar_url,is_verified,is_private,created_at',
        )
        .eq('status', 'active')
        .neq('id', userId)
        .order('created_at', { ascending: false })
        .limit(candidateLimit)
        .abortSignal(signal)
        .returns<ProfileRow[]>();
      if (error) {
        throw error;
      }

      return (data ?? [])
        .filter(
          (profile) => !profile.is_private && !followingIds.has(profile.id),
        )
        .slice(0, suggestedAccountLimit)
        .map(mapProfile);
    } catch (error) {
      throw normalizeFeedError(error);
    }
  }
}

export const suggestionService = new SuggestionService();
