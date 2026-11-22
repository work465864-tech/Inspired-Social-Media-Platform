'use client';

import { memo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Comment } from '../types';
import { CommentEmpty } from './CommentEmpty';
import { CommentFooter } from './CommentFooter';
import { CommentItem } from './CommentItem';

export const CommentList = memo(function CommentList({
  actionError,
  comments,
  currentUserId,
  deletingCommentId,
  hasMore,
  isLoadingMore,
  onDelete,
  onLoadMore,
  onUpdate,
  updatingCommentId,
}: {
  actionError: string | null;
  comments: Comment[];
  currentUserId: string | null;
  deletingCommentId: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onDelete: (commentId: string) => Promise<boolean>;
  onLoadMore: () => void;
  onUpdate: (commentId: string, content: string) => Promise<boolean>;
  updatingCommentId: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: comments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 92,
    getItemKey: (index) => comments[index]?.id ?? index,
    overscan: 5,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];

  useEffect(() => {
    if (
      lastItem &&
      lastItem.index >= comments.length - 4 &&
      hasMore &&
      !isLoadingMore
    ) {
      onLoadMore();
    }
  }, [comments.length, hasMore, isLoadingMore, lastItem, onLoadMore]);

  if (comments.length === 0) {
    return <CommentEmpty />;
  }

  return (
    <div className="min-h-0">
      {actionError && (
        <p
          aria-live="assertive"
          className="mb-2 text-sm text-danger"
          role="alert"
        >
          {actionError}
        </p>
      )}
      <div
        aria-label="Comments"
        className="max-h-[48dvh] min-h-32 overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        ref={scrollRef}
        role="list"
        tabIndex={0}
      >
        <div
          role="presentation"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {virtualItems.map((item) => {
            const comment = comments[item.index];
            if (!comment) {
              return null;
            }

            return (
              <div
                data-index={item.index}
                key={comment.id}
                ref={virtualizer.measureElement}
                role="presentation"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <CommentItem
                  comment={comment}
                  currentUserId={currentUserId}
                  deleting={deletingCommentId === comment.id}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  position={item.index + 1}
                  setSize={comments.length}
                  updating={updatingCommentId === comment.id}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2">
        <CommentFooter
          hasMore={hasMore}
          isLoading={isLoadingMore}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  );
});
