import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

export type FollowCounts = {
  followers: number;
  following: number;
};

export async function getMyFollowCounts(
  signal: AbortSignal,
): Promise<FollowCounts> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    throw authError;
  }
  if (!user) {
    throw new Error('Sign in to load follow counts.');
  }

  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', user.id)
      .eq('status', 'accepted')
      .abortSignal(signal),
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', user.id)
      .eq('status', 'accepted')
      .abortSignal(signal),
  ]);
  if (followersResult.error) {
    throw followersResult.error;
  }
  if (followingResult.error) {
    throw followingResult.error;
  }
  return {
    followers: followersResult.count ?? 0,
    following: followingResult.count ?? 0,
  };
}

export const followQueryKeys = {
  all: ['follows'] as const,
  myCounts: (userId: string) => ['follows', 'counts', userId] as const,
};
