import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('../../../lib/supabase/client', () => ({
  createSupabaseBrowserClient: createClientMock,
}));

import { CommentService } from './commentService';

type QueryResult = {
  data: unknown;
  error: unknown;
};

type QueryBuilder = {
  select: (...args: unknown[]) => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  is: (...args: unknown[]) => QueryBuilder;
  order: (...args: unknown[]) => QueryBuilder;
  range: (...args: unknown[]) => QueryBuilder;
  abortSignal: (...args: unknown[]) => QueryBuilder;
  insert: (...args: unknown[]) => QueryBuilder;
  update: (...args: unknown[]) => QueryBuilder;
  single: () => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
};

const commentRow = {
  id: '00000000-0000-4000-8000-000000000003',
  video_id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000002',
  parent_comment_id: null,
  content: 'A useful thought',
  likes_count: 0,
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: '00000000-0000-4000-8000-000000000002',
    username: 'writer',
    full_name: 'Writer Name',
    avatar_url: null,
    is_verified: false,
  },
};

function createQueryBuilder(result: QueryResult) {
  const pending = Promise.resolve(result);
  let updateValue: unknown;
  const builder: QueryBuilder & { getUpdateValue: () => unknown } = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    range: () => builder,
    abortSignal: () => builder,
    insert: () => builder,
    update: (...values) => {
      updateValue = values[0];
      return builder;
    },
    single: () => pending,
    maybeSingle: () => pending,
    getUpdateValue: () => updateValue,
  };
  return builder;
}

function createMockClient(
  queryResult: QueryResult,
  rpcResult: QueryResult = { data: true, error: null },
) {
  const builder = createQueryBuilder(queryResult);
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: commentRow.user_id } },
        error: null,
      }),
    },
    from: vi.fn(() => builder),
    rpc: vi.fn().mockResolvedValue(rpcResult),
  };
  createClientMock.mockReturnValue(client);
  return { builder, client };
}

describe('CommentService writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a comment using the authenticated owner and maps the author', async () => {
    const { client } = createMockClient({ data: commentRow, error: null });
    const service = new CommentService();

    await expect(
      service.create(
        commentRow.video_id,
        commentRow.user_id,
        '  A useful thought  ',
      ),
    ).resolves.toMatchObject({
      id: commentRow.id,
      content: 'A useful thought',
      author: { username: 'writer', displayName: 'Writer Name' },
    });
    expect(client.auth.getUser).toHaveBeenCalledOnce();
    expect(client.from).toHaveBeenCalledWith('comments');
  });

  it('edits through the owner-only RPC and reads the updated row', async () => {
    const editedRow = { ...commentRow, content: 'Edited thought' };
    const { client } = createMockClient({ data: editedRow, error: null });
    const service = new CommentService();

    await expect(
      service.updateOwnComment(
        commentRow.id,
        commentRow.user_id,
        'Edited thought',
      ),
    ).resolves.toMatchObject({ content: 'Edited thought' });
    expect(client.rpc).toHaveBeenCalledWith('edit_my_comment', {
      target_comment_id: commentRow.id,
      new_content: 'Edited thought',
    });
  });

  it('soft-deletes the owner comment and reports missing rows', async () => {
    const { builder } = createMockClient({
      data: { id: commentRow.id },
      error: null,
    });
    const service = new CommentService();

    await expect(
      service.deleteOwnComment(commentRow.id, commentRow.user_id),
    ).resolves.toBeUndefined();
    expect(builder.getUpdateValue()).toEqual({
      deleted_at: expect.any(String),
    });

    createMockClient({ data: null, error: null });
    await expect(
      service.deleteOwnComment(commentRow.id, commentRow.user_id),
    ).rejects.toMatchObject({ kind: 'comment_unavailable' });
  });
});
