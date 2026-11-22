'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/overlay/Modal';
import { useAuth } from '../../auth/hooks/useAuth';
import { useConnectionStatus } from '../../realtime/hooks/useConnectionStatus';
import {
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../hooks/useCommentMutations';
import { useComments } from '../hooks/useComments';
import { CommentError } from './CommentError';
import { CommentHeader } from './CommentHeader';
import { CommentInput } from './CommentInput';
import { CommentList } from './CommentList';
import { CommentSkeleton } from './CommentSkeleton';
import styles from './CommentSheet.module.css';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The comment could not be saved. Please try again.';
}

export function CommentSheet({
  initialCount,
  liveCount,
  onOpenChange,
  open,
  videoId,
}: {
  initialCount: number;
  liveCount: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  videoId: string;
}) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const connection = useConnectionStatus();
  const comments = useComments(videoId, open, initialCount);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const { create } = createComment;
  const { update } = updateComment;
  const { remove } = deleteComment;
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isCommentsLoading,
    isError: hasCommentsError,
    error: commentsError,
    refetch,
    comments: commentItems,
    totalCount,
  } = comments;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const handleCreate = useCallback(
    async (content: string): Promise<boolean> => {
      setSubmitError(null);
      try {
        await create(videoId, content);
        return true;
      } catch (error) {
        setSubmitError(getErrorMessage(error));
        return false;
      }
    },
    [create, videoId],
  );

  const handleUpdate = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      setActionError(null);
      try {
        await update(videoId, commentId, content);
        return true;
      } catch (error) {
        setActionError(getErrorMessage(error));
        return false;
      }
    },
    [update, videoId],
  );

  const handleDelete = useCallback(
    async (commentId: string): Promise<boolean> => {
      setActionError(null);
      try {
        await remove(videoId, commentId);
        return true;
      } catch (error) {
        setActionError(getErrorMessage(error));
        return false;
      }
    },
    [remove, videoId],
  );

  const onLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const count = Math.max(totalCount, liveCount);

  return (
    <Modal
      className={`${styles.dialog} !fixed !inset-x-0 !bottom-0 !top-auto !m-0 !max-h-[90dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-t-[1.5rem] sm:!bottom-auto sm:!left-1/2 sm:!top-1/2 sm:!right-auto sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!max-h-[85dvh] sm:!w-[calc(100%-2rem)] sm:!max-w-2xl sm:!rounded-card`}
      description="Read and add comments to this video."
      onOpenChange={onOpenChange}
      open={open}
      title="Comments"
    >
      <div className="flex max-h-[calc(90dvh-6rem)] min-h-0 flex-col gap-3 sm:max-h-[calc(85dvh-6rem)]">
        <CommentHeader count={count} />
        <div className="min-h-0 flex-1">
          {isCommentsLoading ? (
            <CommentSkeleton />
          ) : hasCommentsError ? (
            <CommentError
              error={commentsError}
              onRetry={() => void refetch()}
            />
          ) : (
            <CommentList
              actionError={actionError}
              comments={commentItems}
              currentUserId={user?.id ?? null}
              deletingCommentId={
                deleteComment.isPending
                  ? (deleteComment.variables?.commentId ?? null)
                  : null
              }
              hasMore={hasNextPage ?? false}
              isLoadingMore={isFetchingNextPage}
              onDelete={handleDelete}
              onLoadMore={onLoadMore}
              onUpdate={handleUpdate}
              updatingCommentId={
                updateComment.isPending
                  ? (updateComment.variables?.commentId ?? null)
                  : null
              }
            />
          )}
        </div>
        <div className="border-t border-border/70 pt-3">
          {(!connection.isOnline || connection.status === 'offline') && (
            <p
              aria-live="polite"
              className="mb-2 text-xs text-muted"
              role="status"
            >
              You are offline. Your comment will send when you reconnect.
            </p>
          )}
          <CommentInput
            disabled={!isAuthenticated || isAuthLoading}
            disabledMessage={
              isAuthLoading
                ? 'Checking your sign-in status…'
                : 'Sign in to comment.'
            }
            error={submitError}
            onSubmit={handleCreate}
            submitting={createComment.isPending}
            textareaRef={textareaRef}
          />
        </div>
      </div>
    </Modal>
  );
}
