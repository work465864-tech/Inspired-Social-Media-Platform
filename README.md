# Connectly

Connectly is organized as an npm workspace with separate frontend and backend
packages. The frontend uses Next.js App Router, React 19, TypeScript, and
Tailwind CSS 4. The backend remains a route-free Express scaffold.

The social feed includes reusable video likes and comments. The comments
feature uses the existing Supabase comments table, centralized Realtime layer,
TanStack Query cache, and optimistic mutation infrastructure.

The Share & Bookmark feature uses the existing bookmark RPC and table, with
optimistic saved state, paginated saved videos, bookmark Realtime updates, and
canonical Connectly watch links.

The notification center uses the existing notifications table and user
preferences, with recipient-scoped Realtime, unread counts, optimistic read and
delete actions, and filtered pagination.

Realtime synchronization reuses the shared channel manager and event bus for
videos, likes, comments, follows, bookmarks, notifications, and online presence.
Hybrid-feed cache updates preserve the currently viewed video's scroll
position. See the [Realtime architecture](./docs/architecture/realtime.md).

Search provides authenticated people, video, and hashtag results with
debounced suggestions, private recent-search history, bounded trending
hashtags, keyset pagination, and virtualized result lists.

The For You recommendation architecture is feature-isolated: bounded candidate
generation, weighted and diversity-aware ranking, short-lived feed/score caches,
and typed analytics events. It exposes hooks without replacing the existing
feed UI. See the [recommendation architecture](./docs/architecture/recommendation-engine.md).

Media storage access is routed through a provider interface. Supabase Storage
is the configured default; other provider IDs require an adapter before use.
See the [media architecture](./docs/architecture/media-layer.md).

The home and feed routes use a provider-neutral hybrid video feed. Supabase
uploads, trending videos, followed creators, and recommendations are prioritized
before Pixabay fills an underfilled page. Pixabay credentials remain server-only:
set `PIXABAY_API_KEY` in the frontend server environment, never a
`NEXT_PUBLIC_*` variable. Search and the standalone Trending view continue to
use the configured video-provider API. See the
[hybrid feed architecture](./docs/architecture/hybrid-feed.md) and
[video provider architecture](./docs/architecture/video-provider.md).

The vertical video experience reuses the accessible player controls and adds
virtualized playback, active-video autoplay, next-video preloading, feed
gestures, and provider-neutral metadata/actions. Likes and bookmarks in demo
videos are local presentation state only. See the
[video player architecture](./docs/architecture/video-player.md).

Authenticated users can upload MP4, MOV, WebM, and M4V videos through a
browser-side FFmpeg WebAssembly pipeline with metadata inspection, selectable
thumbnail frames, compression profiles, and signed Supabase Storage uploads.
Client-probed dimensions and duration are not persisted as trusted server
metadata; server-side media probing remains a production-hardening follow-up.
See the [upload system architecture](./docs/architecture/upload-system.md) and
[media-processing architecture](./docs/architecture/media-processing.md).

The Creator Studio provides owner-scoped content management, dashboard
analytics, upload history, and a public `/profile/[username]` creator page.
Authenticated playback, impressions, shares, and profile visits are recorded
through a bounded client queue and a server-validated Supabase pipeline. See
the [Creator Studio architecture](./docs/architecture/creator-studio.md).

## Setup

```bash
npm install
```

Copy `frontend/.env.example` to `frontend/.env.local`, then configure:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable/anon key. This key is
  public by design; protect data with RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service-role key required
  for trusted media and creator analytics operations.
- `NEXT_PUBLIC_REQUIRE_VERIFIED_EMAIL`: set to `true` to require a verified
  email before users enter protected routes.
- `NEXT_PUBLIC_MEDIA_PROVIDER`: optional provider ID; defaults to `supabase`.
- `NEXT_PUBLIC_MEDIA_CDN_URL`: optional HTTPS CDN base for future public media
  providers. Signed URLs are never rewritten.
- `PIXABAY_API_KEY`: required for the temporary demo-video source; server-only.
- `VIDEO_PROVIDER`: optional server-only video provider ID; defaults to
  `pixabay` and currently only `pixabay` is implemented.
- `ANALYTICS_HASH_SECRET`: server-only random secret of at least 32 characters
  for HMAC-hashing analytics visitors. Generate a unique value for each
  environment (for example, `openssl rand -hex 32`).

Never put a Supabase service-role key, OAuth client secret, or other privileged
secret in a `NEXT_PUBLIC_*` variable. `SUPABASE_SERVICE_ROLE_KEY` and
`ANALYTICS_HASH_SECRET` must remain server-only.

## Development

Run either workspace from the repository root:

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
```

`npm run dev` and `npm run dev:frontend` start Next.js. The Express process
currently defines no API routes.

## Supabase database and authentication setup

Apply all migrations in filename order using the Supabase CLI or SQL Editor:

1. `supabase/migrations/20261116160000_auth_profiles.sql`
2. `supabase/migrations/20261116170000_oauth_profiles.sql`
3. `supabase/migrations/20261116180000_profile_sync_onboarding.sql`
4. `supabase/migrations/20261116190000_rbac.sql`
5. `supabase/migrations/20261117100000_social_core_schema.sql`
6. `supabase/migrations/20261117101000_storage_buckets.sql`
7. `supabase/migrations/20261119213000_enable_like_realtime.sql`
8. `supabase/migrations/20261119223000_comments_edit_realtime.sql`
9. `supabase/migrations/20261120001500_bookmarks_realtime.sql`
10. `supabase/migrations/20261120010000_notification_center.sql`
11. `supabase/migrations/20261120020000_search_trigram_indexes.sql`
12. `supabase/migrations/20261120030000_notifications_message_repair.sql`
13. `supabase/migrations/20261120040000_explore_discovery_indexes.sql`
14. `supabase/migrations/20261120100000_upload_video_metadata.sql`
15. `supabase/migrations/20261120110000_follows_realtime.sql`

The Realtime migrations depend on the tables created by
`20261117100000_social_core_schema.sql`. If the likes Realtime migration reports
that `public.likes` is missing, apply the earlier schema migrations first, then
rerun `20261119213000_enable_like_realtime.sql`.

The bookmark Realtime migration only adds the existing `public.bookmarks`
table to the Realtime publication. Apply it after the social-core migration.

The notification-center migration adds message support and future event types
to `public.notifications`, creates an upload-ready notification trigger,
enables recipient-only deletion, and adds the table to Realtime. Apply it
after the social-core migration and prior Realtime migrations. See the
[Notifications architecture](./docs/architecture/notifications.md) for the
schema and authorization changes.

The search migration enables `pg_trgm` and creates partial trigram indexes for
active profile names and ready, non-deleted video captions, plus a trigram
index for hashtag slugs. It changes no tables or columns. See the
[Search architecture](./docs/architecture/search.md) for query behavior,
authorization, and the bounded trending-search strategy.

The notifications message-repair migration is a forward-compatible safeguard
for projects where the notification-center migration was previously applied
without exposing `public.notifications.message` to PostgREST. It ensures the
nullable column exists and requests a PostgREST schema-cache reload.

The Explore migration adds partial indexes for ranking ready videos by views
and listing active profiles by creation time. It does not add tables or
columns. See the [Explore architecture](./docs/architecture/explore.md).

The upload metadata migration adds `title` and `description` to the existing
videos table; `caption` remains synchronized with description for existing
feed consumers. Uploads also link normalized hashtags through the existing
`hashtags` and `video_hashtags` tables. See the
[upload system architecture](./docs/architecture/upload-system.md).

The follows Realtime migration adds the existing participant-protected
`public.follows` table to the Supabase Realtime publication. See the
[Realtime architecture](./docs/architecture/realtime.md) for channel ownership,
cache reconciliation, presence limits, and verification notes.

Configure Supabase Auth Site URL, redirect allowlist, email confirmation/SMTP,
and Google/GitHub provider credentials before testing those flows. Configure
Auth rate limits and bot protection in Supabase for production. See
[Supabase setup](./supabase/README.md) and
[Authentication architecture](./docs/authentication-architecture.md) and
[Database architecture](./docs/database-architecture.md) and the
[Comments architecture](./docs/architecture/comments.md) and the
[Share & Bookmark architecture](./docs/architecture/share-bookmark.md) and the
[Notifications architecture](./docs/architecture/notifications.md) and the
[Realtime architecture](./docs/architecture/realtime.md) and the
[Search architecture](./docs/architecture/search.md) and the
[Media architecture](./docs/architecture/media-layer.md).

## Design system

Reusable UI components, theme tokens, accessibility guidance, and import
conventions are documented in the [Connectly design system](./docs/design-system.md).

## Validation

```bash
npm run lint
npm run type-check
npm run build
npm run format:check
```
