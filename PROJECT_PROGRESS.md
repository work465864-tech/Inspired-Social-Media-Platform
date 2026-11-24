# Project progress

## Upload pipeline reliability

**Status: client pipeline hardened; live large-file upload remains unverified.**

- [x] Accept MP4, MOV, WebM, and M4V by extension and container signature,
      treating browser MIME as an unreliable hint.
- [x] Make HTML metadata optional and use it as an FFmpeg metadata fallback.
- [x] Remove application duration/resolution cutoffs, raise the per-object
      limit to 1 GiB, and adapt long-video compression bitrate to that limit.
- [x] Fall back to FFmpeg frame extraction if browser thumbnail decoding fails.
- [ ] Apply `20261123100000_expand_video_upload_limit.sql` and verify a roughly
      500 MB video upload in an authenticated browser against the configured
      Supabase project and its project-level upload limit.

## Social interactions

**Status: connected in the active feed; live Supabase verification remains.**

- [x] Keep profile editing and public creator profiles as the profile
      foundation.
- [x] Connect Supabase video likes and comments to the active hybrid feed.
- [x] Add follow/request/unfollow controls on creator profiles and
      Supabase-backed feed cards.
- [x] Replace the restricted profile-column suggestion query with a bounded
      RPC that returns only public creator fields.
- [x] Repair profile joins using limited public-column grants and RLS filtering
      instead of exposing status, role, or email fields.
- [x] Keep Pixabay demo videos visibly read-only for likes, comments, and
      follows.
- [ ] Apply the documented social-core and suggested-profile migrations in
      the target Supabase project and verify interactions with authenticated
      test accounts.
- [ ] Text-only and image-only posts are not currently implemented; posts in
      this app are videos.

## Completed foundation

- Next.js, React, TypeScript, Tailwind CSS, Supabase, and TanStack Query
  application foundation.
- Feed and video playback layers, upload/processing pipeline, centralized
  Realtime infrastructure, shared optimistic mutation infrastructure, and
  video likes.

## Phase 3.14 — Comments

**Status: implemented; external Supabase and browser verification remain.**

- [x] Reuse the existing comments schema, RLS, soft-delete counter trigger, and
      notification trigger.
- [x] Add paginated queries, optimistic create/edit/delete, rollback, and
      centralized Realtime synchronization.
- [x] Add accessible adaptive comment sheet/modal, virtualized list, and basic
      emoji insertion.
- [x] Add focused validation, cache, formatting, and Realtime unit tests.
- [x] Update setup and architecture documentation.
- [ ] Apply the new migration to a Supabase project and verify RPC/RLS/Realtime
      with authenticated users.
- [ ] Verify the comments sheet on real mobile and desktop browser viewports.

Phase 3.15 was outside the comments implementation scope.

## Phase 3.16 — Share & Bookmarks

**Status: implemented; Supabase migration and browser/device verification remain.**

- [x] Reuse the existing bookmark schema and `toggle_bookmark` RPC; no table or
      database-column changes were needed.
- [x] Add bookmark state, optimistic rollback, paginated saved videos, and
      centralized bookmark Realtime synchronization.
- [x] Add native sharing, accessible fallback dialog, clipboard fallback, and
      canonical `/watch/{videoId}` URLs.
- [x] Add focused cache, Realtime mapping, deep-link, and share-service tests.
- [x] Update setup and architecture documentation.
- [ ] Apply `20261120001500_bookmarks_realtime.sql` to Supabase and verify
      authenticated bookmark reads, RPC writes, and Realtime delivery.
- [ ] Verify share and bookmark flows on mobile and desktop browsers.

## Phase 3.17 — Notifications

**Status: implemented; Supabase migration and authenticated browser verification remain.**

- [x] Add an accessible notification center with All, Likes, Comments, Follows,
      and System filters and infinite pagination.
- [x] Add unread badge/count, read/unread, mark-all-read, and delete actions
      with optimistic updates and rollback.
- [x] Reuse centralized Supabase Realtime and TanStack Query synchronization
      for recipient-filtered insert/update events and duplicate suppression.
- [x] Add account notification settings for likes, comments, follows, push, and
      email preferences; push/email delivery remains future work.
- [x] Add upload-ready notification creation and own-notification DELETE RLS
      through `20261120010000_notification_center.sql`.
- [x] Add focused formatter, preferences, cache rollback, and Realtime tests.
- [x] Update setup and architecture documentation.
- [x] Add a forward-compatible repair migration for the notification message
      column and PostgREST schema cache.
- [ ] Apply the notification migration to Supabase and verify RLS, preference
      behavior, upload trigger, and Realtime delivery with authenticated users.
- [ ] Verify keyboard/focus behavior and responsive layouts in browser
      viewports.

## Phase 3.18 — Search Infrastructure

**Status: implemented; migration and authenticated browser verification remain.**

- [x] Add an authenticated `/search` route with Top, People, Videos, and
      Hashtags tabs, query filters, and responsive result cards.
- [x] Add debounced, cancelable search and suggestions with TanStack Query
      caching, retry, and prefetch support.
- [x] Add private recent-search history with optimistic record/clear behavior,
      plus trending hashtags derived from a bounded sample of visible videos.
- [x] Add keyset pagination, virtualized result rendering, accessible
      keyboard-controlled suggestions/tabs, and empty/loading/error states.
- [x] Add `pg_trgm` GIN indexes for profile names, ready video captions, and
      hashtag slugs without changing tables or columns.
- [x] Add focused utility, history, suggestion, and per-target search tests.
- [x] Update setup and search architecture documentation.
- [ ] Apply `20261120020000_search_trigram_indexes.sql` in Supabase and verify
      the query plans against production-like data and existing RLS.
- [ ] Verify authenticated search and responsive keyboard/screen-reader
      behavior in mobile and desktop browsers.

Recommendations and other future search targets remain out of scope.

## Phase 3.19 — Explore & Discovery Engine

**Status: implemented; migration and authenticated browser verification remain.**

- [x] Replace the Explore placeholder with trending videos, popular this week,
      recently uploaded videos, creators, hashtags, and suggested accounts.
- [x] Add tag-backed category filters using the existing hashtags and
      video_hashtags tables; no new content schema was added.
- [x] Add cached TanStack queries, background refetch, prefetch, keyset
      pagination, and virtualized responsive grids.
- [x] Add accessible horizontal carousel controls, responsive creator/tag
      cards, reduced-motion-aware transitions, and empty/loading/error states.
- [x] Add the separate Explore ranking/profile listing index migration.
- [x] Update setup and architecture documentation.
- [ ] Apply `20261120040000_explore_discovery_indexes.sql` in Supabase and
      inspect plans using production-like data.
- [ ] Verify Explore with authenticated users and mobile/desktop browser
      viewports.

AI recommendations, music/sounds, challenges, and PeerTube remain out of scope.

## Phase 3.20 — Recommendation Engine (For You)

**Status: architecture implemented; durable interaction data and production
feed integration remain out of scope.**

- [x] Add bounded candidate generation from recent, following, trending,
      suggested-creator, and deterministic exploration pools.
- [x] Add a pluggable weighted scoring strategy, freshness/trending scoring,
      category affinity, and creator/category diversity reranking.
- [x] Add cold-start interest profiles, TTL/LRU recommendation and score
      caches, and stable per-session infinite pagination.
- [x] Add hooks for For You pages, flattened recommendations, score lookup, and
      interest profiles without modifying existing feed UI.
- [x] Add typed in-memory analytics event buffering with an injectable sink;
      no Supabase schema or migration changes.
- [x] Add focused ranking, freshness, diversity, cache, and analytics tests and
      update the architecture documentation.
- [ ] Connect consented watch/completion/share/bookmark/quality signals and a
      durable analytics sink when their data contracts are approved.
- [ ] Validate Supabase behavior with authenticated production-like accounts.
- [ ] Obtain approval before integrating the recommendation hook into the
      existing feed UI or starting Phase 3.21.

## Phase 3.21 — Media Infrastructure Layer

**Status: implemented; live Supabase Storage verification remains.**

- [x] Add provider/config/factory abstractions and register Supabase Storage as
      the default implementation.
- [x] Centralize playback and batched thumbnail signed URL generation with
      optional future CDN rewriting for unsigned public URLs.
- [x] Route existing upload validation, signed target creation, resumable
      original upload, and derivative uploads through `MediaService` without
      changing upload UI behavior.
- [x] Add permission-checked draft-asset deletion and provider validation for
      video and thumbnail files.
- [x] Add provider switching, upload, deletion, URL, and validation tests.
- [x] Update environment example, README, changelog, and media architecture
      documentation.
- [ ] Verify Storage access policies, CORS, signed playback, and draft cleanup
      using an authenticated Supabase project.
- [ ] Implement a non-Supabase adapter only after approval for Phase 3.22.

PeerTube, Cloudflare R2, Amazon S3, Bunny.net, and Local Storage adapters are
prepared for registration but are not implemented in this phase.

## Phase 3.22A — Pixabay Video Integration

**Status: implemented; Pixabay credentials and live API behavior require
deployment verification.**

- [x] Add provider, repository, mapper, normalizer, service, and factory
      boundaries; register Pixabay as the temporary default source.
- [x] Add same-origin feed, trending, and search API routes. The API key is
      read server-side only and is never returned to the browser.
- [x] Normalize provider results into the UI-facing video model and include
      required Pixabay attribution.
- [x] Add TanStack Query hooks, prefetch, 24-hour caching, retry/rate-limit
      handling, infinite pagination, and virtualized lazy video playback.
- [x] Wire home and feed route wrappers to the new provider-neutral UI without
      changing existing feed components, upload logic, or database schema.
- [x] Add documentation and focused provider/normalizer tests.
- [ ] Configure `PIXABAY_API_KEY` in the deployment's server environment and
      verify rate-limit headers, CORS-free playback, and cached responses.
- [ ] Implement and register the Supabase, user-upload, Cloudflare Stream, or
      Mux adapter only when replacing the temporary Pixabay source is approved.

## Phase 3.22B — TikTok Video Player Experience

**Status: implemented; browser/device playback verification remains.**

- [x] Reuse the existing accessible video player, playback controls, progress,
      buffering, mute, replay, and fullscreen support.
- [x] Add provider-neutral video cards, creator/caption/hashtag overlays,
      action controls, attribution, and loading presentation.
- [x] Add virtualized feed playback with one active video, off-screen pause,
      and metadata preloading for the next video.
- [x] Add touch-swipe, desktop wheel, and keyboard feed navigation, plus
      double-tap liking and reduced-motion-aware animations.
- [x] Add focused gesture-threshold tests and player architecture docs.
- [ ] Verify playback, gestures, keyboard/focus behavior, and responsive
      layouts in desktop and mobile browsers with the deployed video source.
- [ ] Replace demo-only local likes/bookmarks and unavailable audio metadata
      only when their persistent data contracts are approved.

## Phase 3.22C — Hybrid Feed Engine

**Status: implemented; authenticated Supabase/Storage and deployed Pixabay
verification remain.**

- [x] Add provider-neutral feed contracts and a resolver combining database
      candidates with the existing server-side fallback API.
- [x] Order database candidates as recent user uploads, trending videos,
      followed creators, then recommendations; deduplicate before playback.
- [x] Use Pixabay only to fill database pages that do not contain enough
      playable videos. If fallback fails, retain cached feed data where
      available.
- [x] Add bounded user-scoped feed caching, TanStack background refresh,
      retry, prefetch, and an optimistic cache-update helper.
- [x] Keep the existing feed UI, search, trending view, upload pipeline, and
      database schema unchanged.
- [x] Add provider-resolution/cache tests and architecture documentation.
- [ ] Verify playback URL signing and RLS using an authenticated Supabase
      project, then verify fallback behavior with the deployed Pixabay key.

## Phase 3.23 — User Video Upload System

**Status: implemented; authenticated Supabase Storage and browser FFmpeg
verification remain.**

- [x] Add an authenticated upload UI with drag/drop and file picker, preview,
      compression quality, title/description, visibility, comments, and
      hashtags.
- [x] Validate supported formats/signatures, file size, duration, and minimum
      and maximum resolution before processing.
- [x] Generate compressed MP4 output and thumbnail/preview assets in the
      browser; surface FFmpeg failure details for diagnosis.
- [x] Upload original video with resumable TUS, and upload compressed video
      and thumbnail to signed private Storage paths with progress and cancel.
- [x] Enforce authenticated ownership and upload permission for drafts,
      signing, completion, and cleanup; verify stored object size and MIME type
      before publishing the video record.
- [x] Add title/description columns and link hashtags using existing tables;
      the existing caption remains synchronized with description for feed
      compatibility.
- [x] Fix preparation retry to reuse the existing queue item, and add tests for
      resolution limits.
- [x] Update upload documentation and deployment migration instructions.
- [ ] Apply the upload metadata migration and verify Auth, bucket policies,
      Storage CORS, TUS, signed URLs, and cleanup against a Supabase project.
- [ ] Verify FFmpeg loading/compression, mobile file selection, cancellation,
      and retry behavior in supported browsers.

Live streaming and video editing remain out of scope.

## Phase 3.24 — Media Processing Pipeline

**Status: implemented; browser/device and authoritative server-side media
verification remain.**

- [x] Integrate the existing video-processing architecture into upload
      preparation instead of running a separate compression/thumbnail path.
- [x] Validate MP4, MOV, WebM, and M4V container signatures and inspect decoded
      stream metadata before compression.
- [x] Lazily load and reuse the FFmpeg WebAssembly worker; compress with
      aspect-preserving 480p, 720p, or 1080p profiles and bitrate caps.
- [x] Generate a preview clip, thumbnail/poster variants, and allow selecting
      another thumbnail frame before upload.
- [x] Add metadata, processing status/error, and frame-selection UI plus the
      `useFFmpeg`, `useMediaProcessor`, `useVideoMetadata`, and thumbnail hooks.
- [x] Keep client processing metadata out of persisted asset dimensions and
      duration until a trusted server-side media probe is available.
- [x] Add focused processing-pipeline, metadata-validation, and M4V tests; update
      upload and processing architecture documentation.
- [ ] Verify FFmpeg core loading, memory use, preview/thumbnail generation,
      cancellation, and retry in supported mobile and desktop browsers.
- [ ] Add a server-side media probe before persisting authoritative duration
      and dimensions; current finalization verifies object ownership, size, and
      MIME but does not independently decode uploaded video content.
- [ ] Verify the updated upload-finalization contract against an authenticated
      Supabase project and existing feed consumers.

Live streaming and AI editing are not part of this phase.

## Phase 3.25 — Realtime Feed & Live Synchronization

**Status: implemented; migration and live authenticated Supabase verification
remain.**

- [x] Extend the shared Realtime event bus with provider-independent video
      create/update/delete events and accepted-follow changes.
- [x] Subscribe to ready video changes and all follow, like, comment,
      bookmark, and notification events through the shared subscription
      registry.
- [x] Reconcile the actual hybrid-feed query cache: patch changed counters,
      remove deleted/unavailable videos immediately, and invalidate new-video
      and related domain queries for background refetch.
- [x] Preserve the nearest visible video's viewport offset when feed ordering
      or membership changes; keep stable IDs and resolver deduplication.
- [x] Add online presence tracking and best-effort session-local offline/last
      seen events, plus a self-only follower/following count query hook.
- [x] Add `20261120110000_follows_realtime.sql` and Realtime architecture
      documentation.
- [x] Add focused video/follow event-mapping and hybrid-cache reconciliation
      tests.
- [ ] Apply the follows publication migration and verify RLS-filtered event
      delivery, reconnects, and presence using authenticated Supabase sessions.
- [ ] Add a trusted server-side media probe so newly uploaded database videos
      have authoritative dimensions required by the existing playback mapper.
- [ ] Connect `useMyFollowCounts` to profile presentation when the profile
      counts UI is in scope; public aggregate counts need a separately
      authorized database contract.

Chat, typing indicators, and live streaming remain out of scope.

## Phase 3.26 — Creator Studio and Analytics

**Status: implemented; database migration and authenticated browser verification remain.**

- [x] Add an owner-scoped Creator Studio with overview, analytics, content
      manager, draft manager, upload history, scheduled-post placeholder, and
      moderation placeholder.
- [x] Add paginated search/filter/sort, metadata and hashtag editing, and
      owner-checked soft deletion.
- [x] Add bounded authenticated telemetry for impressions, video starts,
      watch time, completions, shares, repeat views, unique viewers, and
      profile visits; derive creator identity on the server and HMAC visitor
      keys with a server-only secret.
- [x] Add monthly-partitioned events, daily aggregates, RLS, rate limiting,
      dashboard/profile RPCs, and database type updates.
- [x] Add the public `/profile/[username]` page, self-visit exclusion,
      30-minute visit deduplication, and canonical creator links.
- [x] Add focused analytics event-schema tests and document metric definitions,
      privacy, environment configuration, and architecture.
- [ ] Apply `20261121100000_creator_analytics.sql` to Supabase and verify RPCs,
      RLS, partition creation, profile visibility, and authenticated event
      ingestion.
- [ ] Configure `ANALYTICS_HASH_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in each
      deployment environment.
- [ ] Verify Creator Studio and public creator profiles in authenticated
      desktop/mobile browser sessions.

Phase 3.27 remains out of scope pending approval.
