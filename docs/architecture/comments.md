# Comments architecture

## Scope

The comments feature provides a video-scoped sheet, paginated comment reading,
comment creation, and author-only editing/deletion. It does not implement
replies, comment likes, mentions, or moderation UI.

The existing `public.comments` table, RLS policies, soft-delete counter trigger,
and notification trigger remain the source of truth. No tables or columns were
added for this feature.

## Data and authorization

- Reads select non-deleted comments for a visible video and join the existing
  public profile fields.
- Creation uses the existing authenticated insert grant and RLS policy, which
  checks the active author, comment-enabled video, visibility, and parent-video
  relationship.
- Deletion is a soft-delete update of `deleted_at`, restricted by the existing
  author/moderator policy and column grant. The existing trigger updates the
  video comment counter.
- Editing uses `public.edit_my_comment(uuid, text)`. The function runs with a
  fixed empty `search_path`, checks the active authenticated owner and video
  visibility, validates the text length, and updates only the owner's active
  comment. Direct browser updates to `comments.content` remain unavailable.
- The edit function is granted only to `authenticated`; it does not grant
  broader table update privileges.

Apply
`supabase/migrations/20261119223000_comments_edit_realtime.sql` after the
existing schema and like-Realtime migrations.

## Frontend structure

- `features/comments/services/commentService.ts` owns paginated reads and
  authenticated create/edit/soft-delete operations.
- `commentValidationService.ts` trims content and enforces the database's
  2,000 Unicode-code-point limit. Optional filter functions are extension
  points; no profanity or spam policy is enabled.
- `commentRealtimeService.ts` maps comment changes and absolute video comment
  counts into the shared event types.
- `useCommentMutations.ts` uses the shared optimistic mutation layer for cache
  transactions, rollback, and invalidation. Writes do not retry automatically:
  creation is non-idempotent, and mutations should not silently duplicate.
- Offline writes stay in the shared mutation layer's in-memory queue and are
  announced accessibly; queued writes are not persisted across a page reload.
- `useComments.ts` uses TanStack Query infinite pagination; list virtualization
  is provided by `@tanstack/react-virtual`.
- `useVideoCommentsCount.ts` seeds counts from feed data, then synchronizes the
  absolute `videos.comments_count` value from the centralized Realtime channel.
- `CommentSheet` reuses the native modal primitive and adapts to a mobile
  bottom sheet or a centered tablet/desktop modal.

## Realtime flow

The comment hook subscribes to filtered `comments` inserts/updates and the
video's updates through `useSubscription`. The centralized subscription
registry deduplicates channels for the same video. Events dispatch
`COMMENT_CREATED`, `COMMENT_UPDATED`, `COMMENT_DELETED`, and `VIDEO_UPDATED`.
The shared query-sync service invalidates comment queries; a video counter
update also refreshes an open list, including soft deletions that are not
visible to other viewers through comment-row RLS.

The migration adds `comments` to `supabase_realtime`. The existing likes
migration already adds `videos`, which supplies the authoritative counter
updates used here.

## Public UI and hooks

Exports from `frontend/src/features/comments/index.ts` include:

- Hooks: `useComments`, `useComment`, `useCreateComment`, `useUpdateComment`,
  `useDeleteComment`, and `useVideoCommentsCount`.
- UI: `CommentSheet`, `CommentList`, `CommentItem`, `CommentInput`,
  `CommentHeader`, `CommentFooter`, `CommentSkeleton`, `CommentEmpty`,
  `CommentError`, and `EmojiPickerTrigger`.
- Services: `CommentService`, `CommentRealtimeService`,
  `CommentValidationService`, and `CommentFormatter`.

## Future integration points

`parent_comment_id` is already part of the existing schema and query model, but
the current UI does not create or display threads. Comment-level likes,
mentions, profanity/spam providers, moderation workflows, and server-side rate
limits require separate approved work.

## Verification boundary

Unit tests cover validation, optimistic cache reconciliation/rollback,
Realtime payload mapping, and formatting. Live Supabase RLS, RPC, Realtime
delivery, and device-level responsive behavior still need verification against
a configured project and authenticated session.
