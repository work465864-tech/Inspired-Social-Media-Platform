import type { Tables } from '../../../types/database.types';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import {
  FeedDataError,
  normalizeFeedError,
} from '../../feed/services/errorService';
import type { Profile } from '../../feed/types/models';

type SuggestedProfileRow = Pick<
  Tables<'profiles'>,
  'id' | 'username' | 'full_name' | 'avatar_url' | 'is_verified' | 'created_at'
>;

const suggestedAccountLimit = 8;

function mapProfile(row: SuggestedProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.full_name.trim() || row.username,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    isPrivate: false,
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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }
      if (user?.id !== userId) {
        throw new FeedDataError(
          'unauthorized',
          'Sign in again to load suggested creators.',
        );
      }

      const { data, error } = await supabase
        .rpc('get_suggested_profiles', {
          suggestion_limit: suggestedAccountLimit,
        })
        .abortSignal(signal)
        .returns<SuggestedProfileRow[]>();
      if (error) {
        throw error;
      }

      return (data ?? []).map(mapProfile);
    } catch (error) {
      throw normalizeFeedError(error);
    }
  }
}

export const suggestionService = new SuggestionService();
