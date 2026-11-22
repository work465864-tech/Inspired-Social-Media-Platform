# Search architecture

## Scope and route

The authenticated `/search` route searches active profiles, ready videos, and
hashtags using the existing Supabase tables. It adds no tables or columns and
does not implement Explore, recommendations, sounds, playlists, or other
future search targets. The desktop shell search form and mobile search entry
point navigate to this route.

The Top tab returns up to five results of each supported type. People, Videos,
and Hashtags tabs use keyset-paginated results. User cards are informational
because the current application has no public profile-route convention; video
cards link to the existing `/watch/{videoId}` route, and hashtag cards return
to a hashtag search.

## Data access and authorization

`SearchService` queries `profiles`, `videos`, and `hashtags` through the shared
Supabase browser client. User search restricts results to active profiles,
video search restricts results to ready and non-deleted videos, and the
existing Row Level Security policies remain the authorization boundary.
Video search hydrates matching IDs through the existing video and media
services, preserving the existing feed data and signed-thumbnail behavior.

Search history reuses the existing `search_history` table and its
recipient-owned RLS policies. It is read and written only for the authenticated
user; submitted searches are recorded, duplicate entries are collapsed in the
client cache, and clear-history deletes only that user's rows. History is not
used to calculate trending terms.

Trending searches are a bounded proxy based on hashtag counts from at most the
100 most recent visible, ready, non-deleted videos created within the previous
14 days. The result is cached briefly and capped at eight tags. It is not a
global analytics or recommendation system.

## Index migration

Apply `supabase/migrations/20261120020000_search_trigram_indexes.sql` after the
existing migrations. It enables `pg_trgm` and creates GIN indexes used by
substring matching:

- `profiles_username_trgm_idx`: active profile usernames.
- `profiles_full_name_trgm_idx`: active profile full names.
- `videos_caption_search_trgm_idx`: ready video captions that are not deleted.
- `hashtags_slug_trgm_idx`: hashtag slugs.

The migration discovers the installed `gin_trgm_ops` schema so it works with
Supabase installations that place extensions outside `public`. It creates
indexes only; no table, column, RLS policy, or grant changes are included.
Queries require at least three normalized characters to avoid unselective
short trigram searches. The migration has not yet been applied or measured
against production-like data, so index size and query plans still require
verification in the target Supabase project.

## Query and cache behavior

Input is Unicode-normalized, stripped of control characters and unsupported
filter syntax, limited to 120 characters, and debounced. Requests use TanStack
Query cancellation signals, bounded retry for transient failures, and
user-scoped cache keys. `SearchCacheService` supports prefetch for Top and
paginated queries.

People and hashtag pages use their ordered username or slug as the cursor.
Video pages use `(created_at, id)` for recent order and
`(views_count, created_at, id)` for popular order. Cursor validation ensures
that a cursor matches the active result type and sort order. Each page is
limited to 20 items; results are rendered through `@tanstack/react-virtual`.

Suggestions are debounced independently and include matching people, videos,
and hashtags. The combobox supports arrow-key selection, Enter, and Escape.
Search tabs support arrow-key navigation. Loading, empty, retry, and error
states are exposed to assistive technology. Results in the Top tab are bounded
to 15 entries; infinite pagination applies to the individual type tabs.

## Components, hooks, and services

Components include `SearchPage`, `SearchInput`, `SearchSuggestions`,
`SearchHistory`, `SearchTabs`, `SearchFilters`, `SearchResultList`,
`UserResultCard`, `VideoResultCard`, `HashtagResultCard`, `SearchEmpty`,
`SearchLoading`, and `SearchError`.

Hooks include `useSearch`, `useSearchPagination`, `useSearchSuggestions`,
`useSearchHistory`, `useTrendingSearches`, and the shared debounced-query hook
`useDebouncedSearchQuery`.

Services include `SearchService`, `SuggestionService`, `HistoryService`,
`TrendingService`, `SearchCacheService`, and helpers for query normalization,
cursor validation, and history cache updates.

## Verification boundary

Unit tests cover per-type result mapping and video cursors, suggestion mapping,
history deduplication/bounds, query normalization, cursor validation, and
transient retry behavior. Type-check and lint do not require Supabase
credentials. The migration, RLS behavior, query plans, authenticated results,
and responsive screen-reader behavior have not been verified against a live
Supabase project or authenticated mobile/desktop browser session.
