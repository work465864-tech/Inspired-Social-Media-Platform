# Hybrid feed engine

The home and `/feed` views consume one provider-neutral `VideoPage` shape.
`useVideoFeed` is backed by `HybridFeedProvider`; the player components do not
inspect a source ID or provider-specific payload.

## Providers and ordering

- `DatabaseVideoProvider` reads ready Supabase videos visible under the current
  user's RLS policies and signs playback and thumbnail URLs through the existing
  media provider.
- `FeedPriorityEngine` orders and deduplicates database candidate groups:
  recent user uploads, trending videos, followed creators, and recommendations.
- `FallbackVideoProvider` calls the existing same-origin `/api/videos` route.
  The Pixabay API key stays server-side.
- `FeedResolver` serves database videos first and requests fallback pages only
  when the current hybrid page cannot be filled with playable database videos.
  Fallback IDs are deduplicated against database IDs and prior fallback pages.

The current candidate windows are bounded: up to 50 recent uploads, 12
trending videos, 24 followed-creator videos, and 30 recommendation candidates
are assembled per feed session. Source queries preserve their own ordering;
the priority engine preserves that order while merging them. A session is
cached for ten minutes and is scoped to the current user.

## Cache, pagination, and failure handling

`FeedCache` holds the ordered database/fallback session and fallback page
cursor. TanStack Query separately caches feed pages by user ID, refreshes in the
background, retries transient failures, and exposes prefetch and immutable
optimistic-update helpers. When a fallback request fails, an existing cached
page is returned if available; otherwise available database videos are kept.
If neither source can return content, the existing feed error state reports the
failure.

Search and the standalone Trending view continue to use their existing provider
queries. The feed UI and database schema are unchanged.

## Verification boundaries

Priority, deduplication, fallback selection, cached-feed recovery, and cache
expiry/eviction have focused unit tests. Playback URL signing, RLS visibility,
and live Pixabay fallback still require verification against authenticated
Supabase and deployment environments.
