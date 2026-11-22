# Connectly database architecture

## Scope and source of truth

This phase adds the social-domain schema on top of the existing Supabase Auth
profile and RBAC migrations. It does not change authentication, add application
APIs, implement a feed, or implement an upload workflow. SQL migrations are the
source of truth; do not make manual production schema changes without adding a
migration.

The current workspace has no linked Supabase project, Supabase CLI, Docker, or
PostgreSQL client. The SQL was syntax-parsed locally, but migrations, RLS,
storage policies, and generated types were not executed or verified against a
live Supabase database.

The comments feature reuses the existing `comments` table and counter trigger.
Its follow-up migration adds only an owner-checked edit RPC and Realtime
publication membership; it does not add tables or loosen client column grants.

## Migration order

Apply migrations in filename order:

1. `20261116160000_auth_profiles.sql` — profiles, auth-user trigger, profile RLS.
2. `20261116170000_oauth_profiles.sql` — OAuth profile metadata.
3. `20261116180000_profile_sync_onboarding.sql` — profile sync, onboarding, the
   existing public avatars bucket.
4. `20261116190000_rbac.sql` — roles, permissions, and `has_permission`.
5. `20261117100000_social_core_schema.sql` — social tables, policies,
   constraints, indexes, functions, and triggers.
6. `20261117101000_storage_buckets.sql` — private media buckets and object
   policies.
7. `20261119213000_enable_like_realtime.sql` — Realtime publication membership
   for likes and videos.
8. `20261119223000_comments_edit_realtime.sql` — restricted comment-edit RPC
   and comments Realtime publication membership.

The Realtime migrations require the social-core migration to have created the
referenced tables. If a standalone SQL Editor run reports a missing relation,
apply the prerequisite migrations in order before retrying the Realtime script.

The report-reason seed at `supabase/seeds/001_report_reasons.sql` runs after
migrations through the configured `supabase/config.toml` seed path. Seed data
contains only repeatable reference rows, never user data.

The migrations use `IF NOT EXISTS`, replaceable functions, named constraints,
drop-and-create policies/triggers, and upserts where appropriate. This makes
replay safe for the intended schema; `CREATE TABLE IF NOT EXISTS` does not
repair arbitrary schema drift.

## Tables and relationships

`profiles` remains the existing Auth-owned table and keeps its current
`auth.users` relationship, profile sync, and RLS. This phase adds only a
`(role, status)` index. `role_permissions` remains the existing RBAC table.

- `profiles` 1:N `videos`, `comments`, `likes`, `follows`, `bookmarks`,
  `notifications`, `reports`, `user_settings`, `blocked_users`, `saved_searches`,
  `search_history`, `devices`, and `audit_logs`.
- `videos` 1:N `video_assets`, `video_views`, `likes`, `comments`, `bookmarks`,
  and `video_hashtags`.
- `comments` are video-scoped, can reference a parent comment in the same video,
  and have `comment_likes`.
- `follows` and `blocked_users` are user-to-user edge tables with composite
  primary keys and self-edge checks.
- `hashtags` and `videos` are connected many-to-many through `video_hashtags`.
- `reports` reference a seeded `report_reasons` row and exactly one user, video,
  or comment target.
- `notifications` use nullable, typed foreign keys for video, comment, or
  related-user targets instead of an unvalidated polymorphic ID.
- `devices` and `audit_logs` are future-ready security records. Device data
  deliberately excludes IP addresses, raw user-agent strings, tokens, and
  fingerprint material. Audit metadata is size-limited and append-only to app
  roles.

Text ER view:

```text
profiles ──< videos ──< video_assets
    │           ├────< video_views
    │           ├────< likes
    │           ├────< comments ──< comment_likes
    │           │          └─────── parent comment (same video)
    │           ├────< bookmarks
    │           └────< video_hashtags >── hashtags
    ├────< follows >──── profiles
    ├────< blocked_users >── profiles
    ├────< notifications
    ├────< reports >──── report_reasons
    ├───── user_settings
    ├────< saved_searches
    ├────< search_history
    ├────< devices
    └────< audit_logs
```

## RLS and authorization

RLS is enabled on all new public tables. Table privileges are revoked from
`PUBLIC`, `anon`, and `authenticated` first, then the minimum required grants
and policies are applied. `service_role` receives table access for trusted
workers and bypasses RLS as expected in Supabase; it must never be exposed to a
browser or mobile client.

| Data                                   | Access boundary                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Videos                                 | Public rows must be ready, non-deleted, and public on a public profile. Followers-only/private profiles require an accepted follow. Owners can see their non-deleted drafts/hidden rows. Blocks and suspended/banned profiles are enforced by `can_view_video`. Moderation access is global for `videos:hide` and report-scoped for `reports:review`. |
| Video assets                           | Derivatives follow video visibility. Owners can see their assets; moderation roles see only the rows/media permitted by `can_moderate_video`. Storage originals remain private.                                                                                                                                                                       |
| Likes/bookmarks/follows                | Reads are limited by video visibility or relationship participation. Writes use atomic, permission-checked RPC functions.                                                                                                                                                                                                                             |
| Comments                               | Visible only with video access; creation requires an active user, comments enabled, and a visible video. Deletion is a restricted soft-delete update.                                                                                                                                                                                                 |
| Notifications/settings/searches/blocks | Scoped to the owning or recipient user. Notifications can only be created by database triggers/trusted code.                                                                                                                                                                                                                                          |
| Reports                                | Reporters can submit/read their own reports. Moderators with the existing report permissions can review through `review_report`.                                                                                                                                                                                                                      |
| Devices/audit logs                     | Devices are readable only by the owner and are written by trusted code. Audit rows have no client policies or client grants.                                                                                                                                                                                                                          |

Moderator access is checked through the existing `has_permission()` function,
not client-provided role fields. Report review and video moderation mutations
use `SECURITY DEFINER` RPCs with an empty `search_path`, explicit permission
checks, and limited allowed state changes.

## Functions and triggers

Functions added:

- `update_updated_at()` — common updated timestamp trigger.
- `generate_unique_username()` — trusted-side candidate allocation helper;
  the unique profile index remains the final concurrency guard. Existing Auth
  signup behavior is unchanged.
- `can_view_video()` and internal `can_view_video_for_user()` — shared public,
  follower, private, blocked, deleted, and account-status checks.
- `can_moderate_video()` — global moderation permission or an open report related
  to the video, its owner, or a comment on it.
- `increment_video_views()` — service-role-only, idempotent by event UUID,
  returns the denormalized view count, and excludes owner self-views.
- `toggle_like()`, `toggle_bookmark()`, `toggle_follow()`, and
  `toggle_comment_like()` — serialized toggle operations with ownership,
  status, visibility, and block checks.
- `respond_to_follow_request()`, `delete_my_video()`, `moderate_video()`, and
  `review_report()` — bounded ownership/moderation operations.
- `edit_my_comment()` — validates the active owner and visible video before
  changing comment text; client updates to the `content` column remain revoked.
- `create_notification()` — private trigger helper.

Triggers maintain timestamps, video and comment counters, and notifications for
likes, comments/replies, follows/follow requests, follow acceptance, and comment
likes. Audit logging is intentionally not wired to triggers yet; the table is a
restricted architecture surface for future trusted audit sinks.

## Index strategy

Indexes cover:

- Existing unique profile username access plus `(role, status)` moderation
  lookup.
- Video owner chronology and the ready/public chronology path.
- Video asset lookup by video/type.
- View events by video/time and viewer/time.
- Like/comment/follow/bookmark user and target lookups.
- Comment threads and video chronology.
- Hashtag-to-video lookup.
- Notification recipient chronology and unread rows.
- Report review queues, reasons, reporters, reviewers, and targets.
- User-scoped settings, saved searches, search history, blocks, and devices.
- Audit chronology, actor, and entity lookups.

There are no speculative GIN/trigram indexes or feed-ranking indexes. Add them
only alongside a measured query plan. `video_views` and `audit_logs` are
append-oriented and will require an explicit retention/partitioning policy as
they grow. Per-video counter rows can become hot for exceptionally popular
content; sharded/asynchronous counters should be considered when measured write
contention warrants it.

## Storage buckets

All new media buckets are private. Object paths use the owner UUID as the first
folder; video assets use `<owner-uuid>/<video-uuid>/<filename>`.

| Bucket              |          Privacy |   Limit | Allowed MIME types                   | Policy                                                                                     |
| ------------------- | ---------------: | ------: | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `avatars`           | Public, existing |   5 MiB | JPEG, PNG, WebP                      | Existing profile-owner policies are unchanged.                                             |
| `videos-original`   |          Private | 500 MiB | MP4, QuickTime, WebM                 | Owner can access draft originals; writes require a matching owned draft.                   |
| `videos-compressed` |          Private | 500 MiB | MP4, WebM                            | Read follows `can_view_video` or report-scoped moderation; writes are trusted-worker-only. |
| `thumbnails`        |          Private |   5 MiB | JPEG, PNG, WebP                      | Read follows `can_view_video` or report-scoped moderation; writes are trusted-worker-only. |
| `chat-media`        |          Private |  50 MiB | JPEG, PNG, WebP, MP4, MPEG/MP4 audio | Owner-prefix only until a chat membership schema exists.                                   |
| `documents`         |          Private |  10 MiB | PDF                                  | Owner-prefix only.                                                                         |

Bucket MIME and size limits are defense-in-depth, not content validation. A
future trusted upload pipeline must inspect actual bytes, scan media, enforce
project plan limits, and issue short-lived signed URLs after checking video
visibility. Chat recipients cannot access `chat-media` until message and
membership tables/policies are introduced.

## TypeScript types and validation

`frontend/src/types/database.types.ts` provides reusable Supabase-compatible
row, insert, update, and RPC shapes aligned to the checked-in migrations. The
current file is a schema snapshot, not output captured from a live database.
After applying migrations to the intended Supabase project, regenerate and
review it with:

```powershell
.\supabase\types\generate-types.ps1 -ProjectId <project-ref>
```

This requires the Supabase CLI and a valid Supabase CLI login. Authentication
clients are intentionally not changed in this phase.

## Scale and future extensions

The schema uses UUID ownership keys, narrow relation tables, composite
uniqueness for user actions, partial indexes for active/unread paths, and
denormalized engagement counters maintained in the same transaction. No feed
query, ranking model, upload worker, message system, recommendation function,
scheduled retention job, or audit sink is implemented.

Before production scale-up, validate RLS with role-switched integration tests,
benchmark the real feed/query workload with `EXPLAIN (ANALYZE, BUFFERS)`, define
view/search/audit retention, and plan time partitioning for event tables. Apply
schema and storage migrations in a staging Supabase project before production.
