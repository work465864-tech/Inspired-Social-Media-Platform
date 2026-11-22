# Video provider architecture

## Overview

The home and `/feed` route wrappers render the provider-neutral
`VideoFeedPage`. UI components consume the internal `Video` and `VideoPage`
types and call only same-origin `/api/videos` routes through `VideoApiClient`.
They do not import provider implementations or call third-party APIs.

The server flow is:

1. `FeedProviderFactory` selects the configured `VideoProvider`.
2. `VideoService` validates and coordinates feed, trending, or search requests.
3. `VideoRepository` isolates provider access from the service.
4. `PixabayProvider` calls Pixabay's video endpoint and validates its response.
5. `VideoMapper` maps Pixabay fields; `VideoNormalizer` validates the internal
   model before it reaches the application.

Pixabay is the only registered provider currently. `VIDEO_PROVIDER` defaults
to `pixabay`; selecting an unregistered provider fails explicitly. Future
Supabase Videos, user uploads, Cloudflare Stream, or Mux adapters can implement
`VideoProvider` and register with the factory without changing the feed UI.

## API routes and security

- `GET /api/videos?page=1`: latest feed.
- `GET /api/videos/trending?page=1`: popular videos.
- `GET /api/videos/search?q=...&page=1`: validated video search.

`PIXABAY_API_KEY` is read only in the server-side Pixabay adapter from
`process.env.PIXABAY_API_KEY`. It must be configured in the server environment,
never named with a `NEXT_PUBLIC_` prefix, and is never included in API responses
or logs. Client code requests only the same-origin routes.

The API validates pagination and search length, limits result pages, restricts
provider playback/thumbnail URLs to HTTPS Pixabay hosts, maps provider errors
to safe messages, and forwards rate-limit retry information. The API key is
sent only to the fixed Pixabay endpoint.

## Normalized video model

The internal model includes the title, description, thumbnail, playback URL,
duration, dimensions, views, likes, comments, shares, creator, optional
creation time, demo-content flag, and source attribution. Pixabay does not
provide an upload timestamp in its video response, so `createdAt` is `null`
rather than a fabricated date. Missing engagement counts normalize to zero.

Pixabay asks API users to show the content source. Each video links to its
Pixabay source page. Pixabay permits direct embedding of video URLs and asks
that API responses be cached for at least 24 hours. Server fetch caching,
same-origin response headers, and TanStack Query cache durations are set to
24 hours.

## Feed behavior and performance

The video feed uses TanStack Query infinite queries for caching, retries,
background refresh, pagination, and prefetching. A virtualized list bounds the
number of mounted cards. Intersection Observers select the visible video and
trigger next-page loading; only near-viewport video sources are attached.
Playback is muted, inline, and paused when a card leaves the active viewport.
Thumbnails use lazy loading. Skeleton, empty, retry, and rate-limit states are
accessible and responsive.

The UI provides read-only demo engagement counts. Likes, comments, shares, and
user uploads are not connected to Pixabay content.

## Migration plan and limits

To replace Pixabay, implement `VideoProvider` for the target source, normalize
its response to the same `VideoPage` contract, register it in
`FeedProviderFactory`, and set the server-side `VIDEO_PROVIDER`. No UI changes
or database migration are required for an adapter that supplies this contract.
Provider-specific server credentials and signed playback rules remain inside
that adapter.

This phase does not implement user uploads, PeerTube, persistent demo content,
or database changes. Pixabay API rate limits and deployed playback behavior
still need verification with a server-side API key.
