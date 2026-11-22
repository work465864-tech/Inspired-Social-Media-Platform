import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Tables } from '../../../types/database.types';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FollowStatus = 'accepted' | 'pending' | null;
type FollowRow = Pick<Tables<'follows'>, 'status'>;

export class FollowServiceError extends Error {
  constructor(
    readonly kind:
      | 'validation'
      | 'unauthorized'
      | 'permission'
      | 'unavailable'
      | 'unexpected',
    message: string,
  ) {
    super(message);
    this.name = 'FollowServiceError';
  }
}

function validateUserId(userId: string): void {
  if (!uuidPattern.test(userId)) {
    throw new FollowServiceError(
      'validation',
      'This creator is not available to follow.',
    );
  }
}

function normalizeError(error: unknown): FollowServiceError {
  if (error instanceof FollowServiceError) {
    return error;
  }

  const record =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : undefined;
  const code = typeof record?.code === 'string' ? record.code : '';
  const message =
    typeof record?.message === 'string'
      ? record.message
      : 'The follow request could not be completed.';

  if (code === '42501') {
    return new FollowServiceError(
      'permission',
      'You cannot follow this creator. Check your account permissions or blocked users.',
    );
  }
  if (code === 'P0002') {
    return new FollowServiceError(
      'unavailable',
      'This creator is no longer available.',
    );
  }
  return new FollowServiceError('unexpected', message);
}

export class FollowService {
  async getStatus(
    targetUserId: string,
    expectedViewerId: string,
    signal: AbortSignal,
  ): Promise<FollowStatus> {
    validateUserId(targetUserId);
    validateUserId(expectedViewerId);
    if (targetUserId === expectedViewerId) {
      return null;
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, expectedViewerId);
      const { data, error } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', expectedViewerId)
        .eq('following_id', targetUserId)
        .abortSignal(signal)
        .maybeSingle<FollowRow>();

      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      if (data.status !== 'accepted' && data.status !== 'pending') {
        throw new FollowServiceError(
          'unexpected',
          'The server returned an invalid follow status.',
        );
      }
      return data.status;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async toggle(
    targetUserId: string,
    expectedViewerId: string,
  ): Promise<FollowStatus> {
    validateUserId(targetUserId);
    validateUserId(expectedViewerId);
    if (targetUserId === expectedViewerId) {
      throw new FollowServiceError(
        'validation',
        'You cannot follow your own profile.',
      );
    }

    const supabase = createSupabaseBrowserClient();
    try {
      await this.assertCurrentUser(supabase, expectedViewerId);
      const { data, error } = await supabase.rpc('toggle_follow', {
        target_user_id: targetUserId,
      });
      if (error) {
        throw error;
      }
      if (data === 'accepted' || data === 'pending') {
        return data;
      }
      if (data === 'unfollowed') {
        return null;
      }
      throw new FollowServiceError(
        'unexpected',
        'The server returned an invalid follow status.',
      );
    } catch (error) {
      throw normalizeError(error);
    }
  }

  private async assertCurrentUser(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    expectedViewerId: string,
  ): Promise<void> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    if (data.user?.id !== expectedViewerId) {
      throw new FollowServiceError(
        'unauthorized',
        'Sign in again before changing follow settings.',
      );
    }
  }
}

export const followService = new FollowService();
