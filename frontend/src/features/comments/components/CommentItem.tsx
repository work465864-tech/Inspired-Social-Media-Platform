'use client';

import { memo, useState, type FormEvent } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/display/Avatar';
import Button from '../../../components/ui/Button';
import { paths } from '../../../constants/paths.js';
import { Textarea } from '../../../components/ui/inputs/Textarea';
import { commentFormatter } from '../services/commentFormatter';
import type { Comment } from '../types';

export const CommentItem = memo(function CommentItem({
  comment,
  currentUserId,
  deleting,
  onDelete,
  onUpdate,
  position,
  setSize,
  updating,
}: {
  comment: Comment;
  currentUserId: string | null;
  deleting: boolean;
  onDelete: (commentId: string) => Promise<boolean>;
  onUpdate: (commentId: string, content: string) => Promise<boolean>;
  position: number;
  setSize: number;
  updating: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const authorName =
    comment.author?.displayName || comment.author?.username || 'Connectly user';
  const canManage = currentUserId === comment.userId;
  const mentionPattern =
    /(^|[^A-Za-z0-9_.+-])@([A-Za-z0-9_]{3,24})(?![A-Za-z0-9_])/g;
  const contentParts: ReactNode[] = [];
  let contentOffset = 0;
  for (const match of comment.content.matchAll(mentionPattern)) {
    const start = match.index ?? 0;
    const mentionStart = start + (match[1]?.length ?? 0);
    if (start > contentOffset) {
      contentParts.push(comment.content.slice(contentOffset, start));
    }
    if (match[1]) {
      contentParts.push(match[1]);
    }
    const username = match[2];
    if (username) {
      contentParts.push(
        <Link
          className="font-semibold text-primary underline-offset-2 hover:underline"
          href={paths.creatorProfile(username)}
          key={`${mentionStart}-${username}`}
        >
          @{username}
        </Link>,
      );
      contentOffset = mentionStart + username.length + 1;
    }
  }
  if (contentOffset === 0) {
    contentParts.push(comment.content);
  } else if (contentOffset < comment.content.length) {
    contentParts.push(comment.content.slice(contentOffset));
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onUpdate(comment.id, draft)) {
      setEditing(false);
    }
  }

  async function confirmRemoval() {
    if (await onDelete(comment.id)) {
      setConfirmDelete(false);
    }
  }

  return (
    <article
      aria-label={`Comment by ${authorName}`}
      aria-posinset={position}
      aria-setsize={setSize}
      className="flex items-start gap-3 py-3"
      role="listitem"
    >
      {comment.author?.username ? (
        <Link
          aria-label={`View ${authorName}'s profile`}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href={paths.creatorProfile(comment.author.username)}
        >
          <Avatar
            alt={`${authorName}'s avatar`}
            className="h-9 w-9"
            name={authorName}
            size="sm"
            src={comment.author.avatarUrl}
          />
        </Link>
      ) : (
        <Avatar
          alt={`${authorName}'s avatar`}
          className="h-9 w-9"
          name={authorName}
          size="sm"
          src={comment.author?.avatarUrl}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {comment.author?.username ? (
            <Link
              className="text-sm font-semibold text-foreground hover:underline"
              href={paths.creatorProfile(comment.author.username)}
            >
              {authorName}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-foreground">
              {authorName}
            </span>
          )}
          {comment.author?.isVerified && (
            <span
              aria-label="Verified account"
              className="text-xs text-primary"
            >
              ✓
            </span>
          )}
          {comment.author?.username && (
            <span className="text-xs text-muted">
              @{comment.author.username}
            </span>
          )}
          <time
            className="text-xs text-muted"
            dateTime={comment.createdAt}
            title={commentFormatter.formatDateTime(comment.createdAt)}
          >
            {commentFormatter.formatRelativeTime(comment.createdAt)}
          </time>
        </div>

        {editing ? (
          <form
            className="mt-2 space-y-2"
            onSubmit={(event) => void saveEdit(event)}
          >
            <label className="sr-only" htmlFor={`edit-${comment.id}`}>
              Edit your comment
            </label>
            <Textarea
              className="min-h-20 resize-none"
              id={`edit-${comment.id}`}
              maxLength={4000}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              value={draft}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(false);
                }}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={updating || draft.trim().length === 0}
                size="sm"
                type="submit"
              >
                {updating ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
              {contentParts}
            </p>
            {canManage && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {!confirmDelete ? (
                  <>
                    <button
                      className="min-h-8 rounded px-1 text-xs font-semibold text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => setEditing(true)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="min-h-8 rounded px-1 text-xs font-semibold text-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      onClick={() => setConfirmDelete(true)}
                      type="button"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted">
                      Delete this comment?
                    </span>
                    <button
                      className="min-h-8 rounded px-1 text-xs font-semibold text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      disabled={deleting}
                      onClick={() => void confirmRemoval()}
                      type="button"
                    >
                      {deleting ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      className="min-h-8 rounded px-1 text-xs font-semibold text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      disabled={deleting}
                      onClick={() => setConfirmDelete(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
});
