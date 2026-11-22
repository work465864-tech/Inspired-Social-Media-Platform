import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('../../../lib/supabase/client', () => ({
  createSupabaseBrowserClient: createClientMock,
}));

import { SuggestionService } from './suggestionService';

const viewerId = '00000000-0000-4000-8000-000000000001';
const profile = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'creator',
  full_name: 'Creator Name',
  avatar_url: null,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

function createMockClient(
  authenticatedUserId: string | null = viewerId,
  result = { data: [profile], error: null },
) {
  const pending = Promise.resolve(result);
  const builder = {
    abortSignal: () => builder,
    returns: () => pending,
  };
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: authenticatedUserId ? { id: authenticatedUserId } : null,
        },
        error: null,
      }),
    },
    rpc: vi.fn(() => builder),
  };
  createClientMock.mockReturnValue(client);
  return client;
}

describe('SuggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the public-profile RPC and maps returned creators', async () => {
    const client = createMockClient();
    const service = new SuggestionService();

    await expect(
      service.getSuggestedAccounts(viewerId, new AbortController().signal),
    ).resolves.toEqual([
      {
        id: profile.id,
        username: profile.username,
        displayName: profile.full_name,
        avatarUrl: null,
        isVerified: true,
        isPrivate: false,
        createdAt: profile.created_at,
      },
    ]);
    expect(client.rpc).toHaveBeenCalledWith('get_suggested_profiles', {
      suggestion_limit: 8,
    });
  });

  it('rejects a stale viewer before requesting suggestions', async () => {
    const client = createMockClient('00000000-0000-4000-8000-000000000003');
    const service = new SuggestionService();

    await expect(
      service.getSuggestedAccounts(viewerId, new AbortController().signal),
    ).rejects.toThrow('Sign in again to load suggested creators.');
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
