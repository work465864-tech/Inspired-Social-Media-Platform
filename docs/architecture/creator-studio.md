# Creator Studio and Analytics

## Scope

The Creator Studio lives at `/creator-studio` and provides overview metrics,
analytics, content management, drafts/upload history, and future-ready
scheduled-post and moderation tabs. The public, read-only creator route is
`/profile/[username]`. The existing `/profile` route remains the signed-in
profile editor.

Creator content can be searched, filtered by status, sorted, paginated, edited
(title, caption, visibility, hashtags), and soft-deleted. API routes derive the
creator from the authenticated Supabase session. Database RPCs repeat the
ownership check before changing content; admin reads are constrained to that
creator ID.

## Telemetry flow

1. `useVideoAnalyticsTracking` observes persisted-video impressions and
   playback. `ProfileVisitTracker` records an authenticated visit unless the
   viewer is the profile owner. Demo media is excluded.
2. `analyticsEventQueue` assigns event/session IDs, batches at most 50 events,
   flushes on an eight-second timer or page hide, caps its in-memory queue at
   250 events, and retries transient failures.
3. `POST /api/creator-analytics/events` validates the batch, requires an active
   authenticated profile, verifies video/profile targets, derives the video
   owner, excludes self-activity, rejects stale timestamps, and HMAC-hashes the
   authenticated viewer ID using `ANALYTICS_HASH_SECRET`.
4. The server calls `ingest_creator_analytics_events` with its service-role
   client. The RPC accepts service-role calls only, limits a visitor to 500
   events per minute, deduplicates event IDs, applies profile-visit
   deduplication, updates the existing video-view counter on a new playback,
   and updates daily and playback/session aggregates.
5. `AnalyticsService` calls `get_creator_dashboard_snapshot`; the dashboard
   uses validated server results and dynamically loads charts. Raw telemetry
   is never returned to the browser.

Anonymous visitor keys are represented in the database model for a future
extension. The current ingestion endpoint requires authentication and does not
accept anonymous events or client-supplied visitor hashes.

## Event and metric definitions

- **Impression:** a persisted video is at least 60% visible for one second.
- **View/start:** a playback session begins. A newly inserted start increments
  the existing `videos.views_count` through `increment_video_views`.
- **Watch time:** active playback deltas are accumulated and sent in bounded
  intervals. Paused/background time is excluded.
- **Completion:** playback reaches the end threshold (within 0.5 seconds or
  1.5% of duration); completion rate is completed playback sessions divided by
  started sessions in the selected UTC date range.
- **View-through rate:** average maximum playback position divided by known
  duration, capped at 100%. Seeking can increase this measure; it is not a
  verified attentive-view metric.
- **Unique viewers:** distinct HMAC visitor keys among playback starts in the
  selected range. **Repeat views** count starts after the same visitor's first
  start for that video.
- **Average watch:** average accumulated active watch time per playback.
  **Average session watch** is accumulated creator-video watch time grouped by
  the client session ID, not elapsed session wall-clock time.
- **Shares** and **profile visits** are range-scoped. Profile visits are
  authenticated only, exclude self-visits, and are deduplicated for 30 minutes
  per viewer/profile pair.
- **Engagement estimate:** lifetime likes plus comments divided by lifetime
  views for ready, non-deleted videos. Shares are shown separately because
  share instrumentation began with this analytics rollout.

The dashboard supports 7-, 30-, and 90-day UTC date ranges. Daily chart
“views” represent tracked playback starts; legacy view totals remain the
existing `videos.views_count`. Follower series use currently accepted follows
whose creation time precedes each day boundary; historical unfollows are not
reconstructed.

## Storage, access, and privacy

Migration `supabase/migrations/20261121100000_creator_analytics.sql` adds
monthly range partitions for raw events, daily creator aggregates, playback
and session summaries, repeat-view state, and rate-limit state. A trigger
creates event-month partitions on demand; the default partition is a safety
net. Daily rows have owner-scoped RLS. Raw events and supporting tables are
not readable or writable by `anon`/`authenticated`; the server uses the
service-role client for ingestion and dashboard aggregation. The public
profile-statistics RPC returns only counts for viewable videos and public
follower/following totals.

The server stores a keyed HMAC of authenticated viewer IDs, not raw user IDs,
in analytics records. Configure a unique `ANALYTICS_HASH_SECRET` of at least
32 characters and `SUPABASE_SERVICE_ROLE_KEY` as server-only environment
variables. Never use `NEXT_PUBLIC_*` names for either secret. The migration
does not yet define automatic retention or partition pruning; deployment
owners should set a retention policy before collecting production telemetry.

Public profile video queries use the session-bound Supabase client and
existing video RLS. Private-account content remains subject to those policies.
The profile page displays up to 24 viewable videos; pagination is a follow-up.

## Main implementation areas

- `features/creator-analytics`: event schemas, bounded queue, video tracking,
  ingestion and snapshot services.
- `features/creator-studio`: dashboard UI, charts, hooks, owner-scoped services,
  content editor and draft/history modules.
- `features/public-profile`: profile query, read-only profile, future-ready
  tabs, and visit tracking.
- `app/api/creator-analytics/events` and `app/api/creator-studio`: authenticated
  API routes.

## Verification still required

Apply the migration to a disposable or linked Supabase project and verify
partition creation, RPC grants, RLS, profile visibility, and counter behavior.
Run the frontend lint, type-check, tests, and production build. Exercise the
dashboard and public profile with authenticated accounts at mobile and desktop
viewport sizes. Configure the production HMAC secret and agree on an analytics
retention period before launch.
