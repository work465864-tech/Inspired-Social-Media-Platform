'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { feedQueryKeys } from '../../feed/constants/queryKeys';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOptimisticMutation } from '../../mutations/hooks/useOptimisticMutation';
import { commentQueryKeys } from '../constants/queryKeys';
import { commentService } from '../services/commentService';
import {
  prependCachedComment,
  removeCachedComment,
  replaceCachedComment,
  type CommentPages,
} from '../services/commentCache';
import { commentValidationService } from '../services/commentValidationService';
import { CommentServiceError } from '../types/errors';
import type { Comment } from '../types';

type CreateVariables = {
  videoId: string;
  userId: string;
  content: string;
  optimisticId: string;
  createdAt: string;
};

type UpdateVariables = {
  videoId: string;
  commentId: string;
  userId: string;
  content: string;
};

type DeleteVariables = {
  videoId: string;
  commentId: string;
  userId: string;
};

function emptyPages(totalCount: number): CommentPages {
  return {
    pages: [{ items: [], totalCount, nextOffset: null }],
    pageParams: [0],
  };
}

export function useCreateComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useOptimisticMutation<
    Comment,
    CommentServiceError,
    CreateVariables
  >({
    mutationKey: ['comments', 'create'],
    mutationFn: ({ videoId, userId, content }) =>
      commentService.create(videoId, userId, content),
    optimisticUpdate: (variables, transaction) => {
      const { videoId, userId, content, optimisticId, createdAt } = variables;
      const countKey = commentQueryKeys.count(videoId);
      const fallbackCount = queryClient.getQueryData<number>(countKey) ?? 0;
      const optimisticComment: Comment = {
        id: optimisticId,
        videoId,
        userId,
        parentCommentId: null,
        content,
        likesCount: 0,
        deletedAt: null,
        createdAt,
        updatedAt: createdAt,
        author: {
          id: userId,
          username: 'you',
          displayName: 'You',
          avatarUrl: null,
          isVerified: false,
        },
      };

      transaction.update<CommentPages>(
        commentQueryKeys.list(videoId),
        (current) =>
          prependCachedComment(current, optimisticComment, fallbackCount),
      );
      transaction.update<number>(countKey, (current) =>
        Math.max(0, (current ?? fallbackCount) + 1),
      );
    },
    onSuccess: (comment, variables) => {
      queryClient.setQueryData<CommentPages>(
        commentQueryKeys.list(variables.videoId),
        (current) =>
          replaceCachedComment(current, comment, variables.optimisticId) ??
          current,
      );
    },
    invalidate: (_data, _error, { videoId }) => [
      { queryKey: commentQueryKeys.list(videoId) },
      { queryKey: commentQueryKeys.count(videoId) },
      { queryKey: feedQueryKeys.all },
    ],
    retry: false,
  });
  const { mutateAsync } = mutation;

  const create = useCallback(
    async (videoId: string, value: string): Promise<Comment> => {
      if (!user?.id) {
        throw new CommentServiceError('unauthorized', 'Sign in to comment.');
      }

      const content = commentValidationService.validate(value);
      return mutateAsync({
        videoId,
        userId: user.id,
        content,
        optimisticId: `optimistic-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
      });
    },
    [mutateAsync, user?.id],
  );

  return {
    create,
    error: mutation.error,
    isPending: mutation.isPending,
  };
}

export function useUpdateComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useOptimisticMutation<
    Comment,
    CommentServiceError,
    UpdateVariables
  >({
    mutationKey: ['comments', 'update'],
    mutationFn: ({ commentId, userId, content }) =>
      commentService.updateOwnComment(commentId, userId, content),
    optimisticUpdate: (variables, transaction) => {
      const { videoId, commentId, content } = variables;
      const count = queryClient.getQueryData<number>(
        commentQueryKeys.count(videoId),
      );
      const pages =
        queryClient.getQueryData<CommentPages>(
          commentQueryKeys.list(videoId),
        ) ?? emptyPages(count ?? 0);
      const existing = pages.pages
        .flatMap((page) => page.items)
        .find((comment) => comment.id === commentId);

      if (existing) {
        transaction.update<CommentPages>(
          commentQueryKeys.list(videoId),
          (current) =>
            replaceCachedComment(current, {
              ...existing,
              content,
              updatedAt: new Date().toISOString(),
            }) ?? pages,
        );
      }
    },
    onSuccess: (comment, variables) => {
      queryClient.setQueryData<CommentPages>(
        commentQueryKeys.list(variables.videoId),
        (current) => replaceCachedComment(current, comment) ?? current,
      );
      queryClient.setQueryData(
        commentQueryKeys.detail(variables.commentId),
        comment,
      );
    },
    invalidate: (_data, _error, { videoId }) => [
      { queryKey: commentQueryKeys.list(videoId) },
      { queryKey: feedQueryKeys.all },
    ],
    retry: false,
  });
  const { mutateAsync } = mutation;

  const update = useCallback(
    async (
      videoId: string,
      commentId: string,
      value: string,
    ): Promise<Comment> => {
      if (!user?.id) {
        throw new CommentServiceError(
          'unauthorized',
          'Sign in to edit comments.',
        );
      }

      return mutateAsync({
        videoId,
        commentId,
        userId: user.id,
        content: commentValidationService.validate(value),
      });
    },
    [mutateAsync, user?.id],
  );

  return {
    update,
    error: mutation.error,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}

export function useDeleteComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useOptimisticMutation<
    void,
    CommentServiceError,
    DeleteVariables
  >({
    mutationKey: ['comments', 'delete'],
    mutationFn: ({ commentId, userId }) =>
      commentService.deleteOwnComment(commentId, userId),
    optimisticUpdate: (variables, transaction) => {
      const { videoId, commentId } = variables;
      const countKey = commentQueryKeys.count(videoId);
      const fallbackCount = queryClient.getQueryData<number>(countKey) ?? 0;
      transaction.update<CommentPages>(
        commentQueryKeys.list(videoId),
        (current) =>
          removeCachedComment(current, commentId) ??
          current ??
          emptyPages(fallbackCount),
      );
      transaction.update<number>(countKey, (current) =>
        Math.max(0, (current ?? fallbackCount) - 1),
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: commentQueryKeys.detail(variables.commentId),
        exact: true,
      });
    },
    invalidate: (_data, _error, { videoId }) => [
      { queryKey: commentQueryKeys.list(videoId) },
      { queryKey: commentQueryKeys.count(videoId) },
      { queryKey: feedQueryKeys.all },
    ],
    retry: false,
  });
  const { mutateAsync } = mutation;

  const remove = useCallback(
    async (videoId: string, commentId: string): Promise<void> => {
      if (!user?.id) {
        throw new CommentServiceError(
          'unauthorized',
          'Sign in to delete comments.',
        );
      }

      await mutateAsync({
        videoId,
        commentId,
        userId: user.id,
      });
    },
    [mutateAsync, user?.id],
  );

  return {
    remove,
    error: mutation.error,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}
