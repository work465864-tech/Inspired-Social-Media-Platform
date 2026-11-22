import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ConflictResolver } from '../../mutations/services/conflictResolver';
import { RollbackService } from '../../mutations/services/rollbackService';
import type { Comment } from '../types';
import {
  prependCachedComment,
  removeCachedComment,
  replaceCachedComment,
  type CommentPages,
} from './commentCache';

const firstComment: Comment = {
  id: 'comment-1',
  videoId: 'video-1',
  userId: 'user-1',
  parentCommentId: null,
  content: 'First',
  likesCount: 0,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  author: null,
};

const secondComment: Comment = {
  ...firstComment,
  id: 'comment-2',
  content: 'Second',
};

describe('comment optimistic cache helpers', () => {
  it('adds an optimistic comment and reconciles it to a server ID', () => {
    const optimistic = { ...firstComment, id: 'optimistic-1' };
    const added = prependCachedComment(undefined, optimistic, 4);
    const reconciled = replaceCachedComment(
      added,
      firstComment,
      'optimistic-1',
    );

    expect(reconciled?.pages[0]?.items.map((item) => item.id)).toEqual([
      'comment-1',
    ]);
    expect(reconciled?.pages[0]?.totalCount).toBe(5);
  });

  it('removes a comment from a later page and updates the shared count once', () => {
    const pages: CommentPages = {
      pages: [
        { items: [firstComment], totalCount: 2, nextOffset: 1 },
        { items: [secondComment], totalCount: 2, nextOffset: null },
      ],
      pageParams: [0, 1],
    };

    const updated = removeCachedComment(pages, 'comment-2');
    expect(updated?.pages[0]?.totalCount).toBe(1);
    expect(updated?.pages[1]?.totalCount).toBe(2);
    expect(updated?.pages.flatMap((page) => page.items)).toEqual([
      firstComment,
    ]);
  });

  it('rolls back a failed optimistic comment removal', () => {
    const queryClient = new QueryClient();
    const key = ['comments', 'video', 'video-1', 'list'];
    const pages: CommentPages = {
      pages: [{ items: [firstComment], totalCount: 1, nextOffset: null }],
      pageParams: [0],
    };
    queryClient.setQueryData(key, pages);

    const transaction = new RollbackService(
      queryClient,
      new ConflictResolver(),
    ).createTransaction();
    transaction.update<CommentPages>(
      key,
      (current) => removeCachedComment(current, firstComment.id) ?? pages,
    );
    expect(
      queryClient.getQueryData<CommentPages>(key)?.pages[0]?.items,
    ).toEqual([]);

    transaction.rollback();
    expect(queryClient.getQueryData(key)).toEqual(pages);
    queryClient.clear();
  });
});
