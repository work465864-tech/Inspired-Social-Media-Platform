import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('../../../lib/supabase/client', () => ({
  createSupabaseBrowserClient: createClientMock,
}));

import { FollowService } from './followService';

type QueryResult = {
  data: unknown;
  error: unknown;
};

type QueryBuilder = {
  select: (...args: unknown[]) => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  abortSignal: (...args: unknown[]) => QueryBuilder;
  maybeSingle: () => Promise<QueryResult>;
};

const viewerId = '00000000-0000-4000-8000-000000000001';
const targetId = '00000000-0000-4000-8000-000000000002';

function createMockClient(
  statusResult: QueryResult = { data: null, error: null },
  toggleResult: QueryResult = { data: 'accepted', error: null },
  authenticatedUserId: string | null = viewerId,
) {
  const pending = Promise.resolve(statusResult);
  const builder: QueryBuilder = {
    select: () => builder,
    eq: () => builder,
    abortSignal: () => builder,
    maybeSingle: () => pending,
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
    from: vi.fn(() => builder),
    rpc: vi.fn().mockResolvedValue(toggleResult),
  };
  createClientMock.mockReturnValue(client);
  return client;
}

describe('FollowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads accepted and pending follow states for the current viewer', async () => {
    const service = new FollowService();
    createMockClient({ data: { status: 'pending' }, error: null });

    await expect(
      service.getStatus(targetId, viewerId, new AbortController().signal),
    ).resolves.toBe('pending');

    createMockClient({ data: { status: 'accepted' }, error: null });
    await expect(
      service.getStatus(targetId, viewerId, new AbortController().signal),
    ).resolves.toBe('accepted');
  });

  it('maps follow and unfollow RPC results to the UI status', async () => {
    const service = new FollowService();
    const client = createMockClient(
      { data: null, error: null },
      { data: 'pending', error: null },
    );

    await expect(service.toggle(targetId, viewerId)).resolves.toBe('pending');
    expect(client.rpc).toHaveBeenCalledWith('toggle_follow', {
      target_user_id: targetId,
    });

    createMockClient(
      { data: null, error: null },
      { data: 'unfollowed', error: null },
    );
    await expect(service.toggle(targetId, viewerId)).resolves.toBeNull();
  });

  it('rejects a stale session and invalid profile IDs', async () => {
    const service = new FollowService();
    createMockClient(
      { data: null, error: null },
      { data: 'accepted', error: null },
      targetId,
    );

    await expect(service.toggle(targetId, viewerId)).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    await expect(service.toggle('not-a-uuid', viewerId)).rejects.toMatchObject({
      kind: 'validation',
    });
  });
});
