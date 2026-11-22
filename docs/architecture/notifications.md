# Notifications architecture

## Scope

The notification feature adds a recipient-owned inbox with unread count,
filtered pagination, read/unread actions, mark-all-read, deletion, editable
notification preferences, and in-app realtime toasts. It uses the shared
Supabase browser client, TanStack Query cache, optimistic mutation layer,
Realtime subscription registry, event bus, and query synchronization service.
It does not change authentication, feed, video, likes, comments, follows,
sharing, or bookmarks behavior.

## Data and authorization

- The existing `public.notifications` table remains the source of truth.
  Migration `20261120010000_notification_center.sql` adds nullable `message`
  text (limited to 2,000 characters), enables mention/share/video-ready/admin
  event types, and updates the event-target constraint.
- Existing reads and `read_at` updates remain recipient-scoped. The migration
  adds authenticated DELETE permission with a policy requiring
  `recipient_id = auth.uid()`.
- `create_notification` continues to run as a restricted trigger helper and
  now suppresses an event only when its category preference is explicitly
  `false`. Likes/comment likes use `likes`; comments/replies/mentions use
  `comments`; follow events use `follows`. Missing settings and missing or
  malformed preference fields default to enabled. System, admin, and upload
  notifications are not suppressed by those social categories.
- A video-status trigger creates one `video_upload_success` notification when
  a video first becomes `ready`. Repeated notifications for the same recipient
  and video are prevented.
- The new message column lets system, admin, and upload notifications render
  useful text without adding a separate notification-content table.

Apply the migration after
`20261117100000_social_core_schema.sql` and the existing Realtime migrations.
It is rerunnable, requires the `supabase_realtime` publication, and is checked
in separately from React code. Regenerate database types from Supabase after
applying it if the project uses generated types.

For an existing deployment where the REST API reports that
`notifications.message` is missing, apply
`20261120030000_notifications_message_repair.sql`. It safely adds the nullable
column if needed and sends `NOTIFY pgrst, 'reload schema'`; it does not change
notification query behavior.

## Queries and mutations

`useNotifications` reads 30 rows at a time, ordered by creation time and ID,
with filters for All, Likes, Comments, Follows, and System. `useUnreadCount`
uses an exact head count. Both use a user-scoped TanStack Query key.

Read/unread, mark-all-read, and delete actions use `useOptimisticMutation`.
Cached pages and the unread count update immediately; failed requests roll
back, and settled requests invalidate affected notification queries.
Notification settings reuse the existing `user_settings.notifications` JSON
object; malformed/missing values safely resolve to the existing enabled
defaults.

## Realtime and PWA readiness

The app subscribes to `public.notifications` only for the signed-in recipient
and handles INSERT and UPDATE. DELETE is intentionally not subscribed because
delete payloads cannot safely support recipient filtering; local delete
mutations update the cache directly. The migration adds the notifications
table to `supabase_realtime`. Created events are deduplicated in memory, then
dispatched through the shared event bus to invalidate the list and unread
count. A recipient-scoped toast loads its display data from Supabase.

Push and email values are preferences only. Service-worker registration, Web
Push, browser permission prompts, push delivery, and click-action routing are
not implemented in this phase.

## Components and hooks

Components include `NotificationCenter`, `NotificationList`,
`NotificationCard`, `NotificationAvatar`, `NotificationEmpty`,
`NotificationSkeleton`, `NotificationSettings`, and `NotificationToast`.
The existing shell `NotificationBadge` is wired to the unread-count hook.

Hooks include `useNotifications`, `useUnreadCount`, `useMarkAsRead`,
`useDeleteNotification`, `useNotificationSettings`, and
`useNotificationRealtime`.

## Verification boundary

Focused unit tests cover formatting, cache updates/rollback, preference
defaults, and Realtime payload mapping/deduplication. The migration has not
been applied to a live Supabase project in this environment, so actual RLS,
Realtime delivery, upload-trigger behavior, and browser layout/accessibility
still require authenticated project and browser verification.
