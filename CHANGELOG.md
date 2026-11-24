# Changelog

## Unreleased

### Added

- Connected the active hybrid feed to persistent, optimistic likes and
  comments for Supabase videos, and added working follow controls on creator
  profiles and feed cards. Pixabay demo content is read-only for likes,
  comments, and follows.
- Fixed creator suggestions by replacing a direct read of restricted profile
  columns with an authenticated, bounded RPC that excludes private, inactive,
  already-followed, and blocked accounts. Restored safe public verification
  and privacy flags to profile joins while keeping inactive profiles filtered
  by RLS and sensitive profile columns restricted.
- Added the Creator Studio dashboard, analytics charts, paginated content
  management, upload history, metadata editing, and soft deletion.
- Added authenticated creator telemetry for profile visits, impressions,
  playback starts/watch time/completions, repeat views, unique viewers, and
  shares, with server-side target validation, HMAC visitor keys, batching, and
  bounded retries.
- Added a partitioned analytics migration with daily aggregates, rate limiting,
  owner-safe dashboard snapshots, profile statistics, and restricted metadata
  editing; added the canonical read-only `/profile/[username]` page and
  creator-profile links across the app.
- Added Creator Studio and telemetry architecture documentation. Live Supabase
  migration/RLS verification and browser/device testing remain deployment
  follow-ups.
- Added an integrated local media-processing pipeline with lazy cached FFmpeg
  loading, MP4/MOV/WebM/M4V validation, metadata extraction, 480p/720p/1080p
  compression profiles, preview generation, and selectable thumbnail frames.
- Added processing hooks and upload UI for status/errors, video metadata, and
  thumbnail selection. Upload finalization no longer persists unverified
  client-supplied dimensions or duration.
- Added authenticated video uploads with format, size, duration, and resolution
  validation; FFmpeg compression; preview/thumbnail generation; cancellable
  resumable Supabase Storage uploads; and server-side draft finalization.
- Added best-effort HTML-to-FFmpeg metadata fallback, FFmpeg thumbnail fallback,
  bounded thumbnail canvases, dimension diagnostics, and adaptive long-video
  compression bitrates. Removed duration and resolution cutoffs and raised the
  Supabase per-object video limit to 1 GiB.
- Added upload title, description, visibility, comment settings, and hashtag
  metadata using a narrow videos-table migration and existing hashtag tables.
- Fixed FFmpeg initialization by excluding public `.wasm` assets from the
  authentication proxy; fixed preparation retry to reuse its queued file and
  exposed the underlying FFmpeg failure detail.
- Added upload-system documentation and focused minimum-resolution tests.
- Added a hybrid feed resolver that prioritizes recent Supabase uploads,
  trending videos, followed creators, and recommendations before using Pixabay
  to fill an underfilled page.
- Added provider-neutral database/fallback adapters, stable source ordering,
  cross-source deduplication, user-scoped feed caching, fallback recovery, and
  TanStack Query prefetch/optimistic-cache helpers.
- Added focused tests for source priority, deduplication, fallback, cached-feed
  recovery, and cache expiry/eviction; documented the hybrid feed architecture.
- Added a virtualized vertical video player experience with active-only
  autoplay, pause-on-scroll, next-video preloading, swipe/wheel/keyboard
  navigation, playback overlays, and accessible loading states.
- Added provider-neutral video descriptions/actions, double-tap like animation,
  reduced-motion support, and focused feed-gesture tests. Demo likes and
  bookmarks remain local presentation state.
- Documented playback, accessibility, interaction, and remaining verification
  limits in the video player architecture.
- Added a provider-neutral video feed with a server-side Pixabay adapter,
  normalized video data, paginated API routes, and a virtualized autoplay UI.
- Added video feed, trending, and search hooks with 24-hour caching, API-key
  isolation, rate-limit handling, and visible Pixabay attribution.
- Added provider architecture and migration documentation without changing the
  database schema, upload pipeline, or existing feed components.
- Added a provider-based media service with a Supabase Storage adapter,
  centralized signed URL/CDN resolution, upload validation, and provider
  switching through configuration.
- Routed the existing upload and thumbnail-signing flows through the provider
  facade without changing upload UI behavior; added permission-checked draft
  asset deletion and media-layer tests.
- Documented supported configuration, future provider extension points, and
  the private-bucket URL strategy.
- Added a standalone For You recommendation pipeline with bounded candidate
  sources, pluggable scoring strategy, weighted ranking, creator/category
  diversity, cached session pagination, cold-start interests, and typed
  analytics buffering. The existing feed UI is unchanged.
- Added hooks for For You pages, recommendations, score lookup, and interest
  profiles, plus ranking/cache/analytics tests and architecture documentation.
- Added an Explore discovery page with trending and popular videos, recent
  uploads, trending creators and hashtags, suggested accounts, and category
  filters.
- Added keyset-paginated and virtualized video grids, cached discovery queries,
  responsive carousels, and separate Explore performance indexes.
- Documented discovery ranking boundaries and existing-schema/RLS usage.
- Added an idempotent notification-message repair migration that also reloads
  the PostgREST schema cache.
- Added an authenticated search experience for people, videos, and hashtags
  with debounced suggestions, recent and trending searches, filters,
  keyset pagination, and virtualized results.
- Added search-specific `pg_trgm` indexes without changing database tables or
  columns, plus search service, history, pagination, and suggestion tests.
- Documented the search architecture, index migration, and verification limits.
- Added an accessible notification center with filtered pagination, unread
  counts, optimistic read/delete actions, preference controls, and
  recipient-scoped Realtime updates.
- Added a rerunnable notification migration for message/event support,
  video-ready notifications, recipient-only deletion, and Realtime publication.
- Documented the feature in [notifications architecture](./docs/architecture/notifications.md).
- Added an optimistic, realtime-synchronized bookmark control and paginated
  saved-video gallery using the existing bookmark table and RPC.
- Added native/fallback sharing, clipboard support, and canonical watch links
  with a shareable video destination.
- Added a rerunnable migration to enable Realtime for the existing bookmarks
  table and documented the Share & Bookmark architecture.
- Added the reusable comments experience with paginated, virtualized lists,
  emoji insertion, optimistic create/edit/delete, and live video comment counts.
- Added centralized Realtime mapping for comment changes and video counter
  updates, reusing the existing subscription registry and event bus.
- Added provider-independent video and accepted-follow Realtime mapping,
  including ready-state transitions, like removals, and a follows publication
  migration.
- Connected Realtime events to the actual hybrid-feed cache, patched absolute
  video counters, removed deleted videos immediately, and preserved the
  visible feed anchor during refreshes.
- Added authenticated online presence, best-effort session-local last-seen
  events, and a self-only follow-count query hook; documented remaining RLS
  and server-side media metadata limitations.
- Added a restricted owner-only `edit_my_comment` RPC and enabled comment
  Realtime without changing the existing comments table or client column grants.
- Documented the feature in [comments architecture](./docs/architecture/comments.md).
