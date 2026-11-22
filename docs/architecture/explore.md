# Explore & Discovery architecture

The authenticated `/explore` route composes discovery sections from the
feature-first `frontend/src/features/explore` module. It reuses the existing
video, profile, hashtag, and video-hashtag tables and the feed's video and
thumbnail hydration services. The feature adds no tables or columns and does
not modify authentication, feed, player, notifications, or search behavior.

## Sections and ranking

- **Trending videos:** ready, non-deleted videos from the last 72 hours, sorted
  by view count, creation time, then ID.
- **Popular this week:** the same ranking for the last seven days.
- **Recently uploaded:** keyset-paginated ready videos sorted by creation time
  and ID.
- **Trending creators:** aggregates views and video counts from at most the 250
  newest ready videos in the last 30 days. Private profiles are omitted.
- **Trending hashtags:** counts hashtag links for at most the 250 newest ready
  videos in the last 14 days.
- **Suggested accounts:** active, public profiles excluding the signed-in user
  and accounts they already follow.
- **Categories:** category chips resolve to exact hashtag slugs in the existing
  `hashtags` table and filter videos through `video_hashtags`.

The creator and hashtag sections are bounded heuristics, not global totals or
personalized recommendations. Music, sounds, challenges, AI ranking, and
recommendations are future work.

## Data access and state

`ExploreService` requests a page of video identifiers and ranking fields, then
hydrates records through the existing feed services. It uses keyset cursors to
avoid offset pagination and aborts timed-out or superseded requests. The
`TrendingService`, `SuggestionService`, and `CategoryService` encapsulate
discovery-specific queries. TanStack Query hooks provide caching, retries,
background refetch, and prefetching.

Supabase RLS remains authoritative for all result visibility. Queries request
only columns already exposed to authenticated users; the page does not bypass
RLS or use service-role credentials.

## Index migration

Apply `supabase/migrations/20261120040000_explore_discovery_indexes.sql`:

- `videos_ready_popular_idx` orders ready, non-deleted videos by views,
  creation time, and ID, supporting the popular/trending ranking and its
  keyset cursor.
- `profiles_active_created_idx` supports the active-profile creation-time
  ordering used to select suggested accounts.

Both are partial indexes and add no columns or tables. The migration is safe to
rerun. Validate query plans against production-like data after applying it;
the application remains protected by existing RLS.

## Validation boundaries

Unit tests cover video page ordering, category hashtag filtering, and cursor
construction. Type checking, linting, tests, and production build are run as
part of the implementation. Live Supabase query plans and authenticated
mobile/desktop browser behavior require deployment credentials and remain
external verification steps.
