# For You recommendation engine

The recommendation architecture lives in
`frontend/src/features/recommendations`. It adds a separately callable
`useForYouFeed()` and does not replace or alter the existing feed route, UI,
video player, or feed queries.

## Pipeline

1. `CandidateGenerator` fetches bounded batches from the existing recent feed,
   followed creators, Explore trending videos, and suggested creators. It
   attaches visible hashtag tags and category slugs, deduplicates by video ID,
   and hydrates thumbnails through the existing feed media service.
2. `InterestService` loads a cached profile or supplies a cold-start profile.
   The initial profile uses the browser language when available; interests,
   preferred categories, and region are empty/unknown unless supplied through
   the service API.
3. `RankingEngine` delegates to the `RecommendationScoringStrategy`
   interface. `RankingService` is the current weighted implementation; an
   on-device or remote AI/ML strategy can replace it without changing candidate
   generation or pagination.
4. `FeedAssembler` greedily reranks the scored batch, balancing score with
   creator and category diversity.
5. `RecommendationService` stores the ranked batch in a bounded, short-lived
   session cache and returns session-offset cursors over that immutable
   session. Expired or user-mismatched cursors fail explicitly.

The sources are all bounded: 36 recent videos, up to 24 followed-creator
videos, 12 trending videos, up to 24 videos from suggested creators, plus a
stable per-user/per-day exploration sample from the recent pool. Existing
Supabase RLS remains authoritative for all rows; no service-role access is
used.

## Weighted score

The initial model uses normalized 0–1 features with these weights:

| Signal                  | Weight |
| ----------------------- | -----: |
| Watch time              |   0.12 |
| Completion rate         |   0.10 |
| Likes                   |   0.06 |
| Comments                |   0.05 |
| Shares                  |   0.05 |
| Bookmarks               |   0.05 |
| Follow status           |   0.10 |
| Freshness               |   0.10 |
| Trending score          |   0.10 |
| Creator diversity       |   0.08 |
| Category diversity      |   0.05 |
| Video quality           |   0.05 |
| Category/topic affinity |   0.09 |

The pointwise score is `100 * sum(weight * available_signal) /
sum(available_weights)`. Missing signals are omitted and the remaining
pointwise weights are renormalized rather than treating unavailable data as a
negative. The assembler then combines that 0–100 score with available diversity
signals using the 0.08 creator and 0.05 category weights; diversity is
recomputed at each assembly position. Freshness uses a 72-hour exponential
half-life. The batch-relative trending heuristic combines log-scaled views
(65%) and engagement (35%).

## Available data and cold start

The current schema provides view counts, like/comment counters, follow
relationships, and hashtag links. The existing view event records only
`video_id`, `viewer_id`, and `viewed_at`; it does not provide watch duration or
completion. Shares, bookmarks, quality scores, and durable user preferences
are not exposed by the recommendation feature. Those score inputs therefore
remain nullable and are excluded until a trusted source is connected.

Cold-start users receive a safe baseline with no inferred interests or region.
Cold-start videos still enter through recent, trending, creator, and exploration
candidates and receive freshness/trending scores. No database changes or SQL
migration are needed.

## Caching, pagination, and analytics

TanStack Query supplies per-user infinite-feed caching, retry policy, background
refetch on reconnect/focus, and stale-time refresh. The in-memory
`RecommendationCache` adds bounded TTL caches for ranked sessions, scores, and
interest profiles. The session cursor avoids offset queries and keeps page
ordering stable while a feed is consumed.

`RecommendationAnalyticsService` defines impression, view, watch-duration,
skip, replay, like, comment, follow, share, and bookmark events. It buffers up
to 500 typed events in memory and requires a configured sink to flush; it does
not persist events or write to existing Supabase tables. Existing UI actions
are not instrumented in this phase.

## Future integration points

- Implement `RecommendationScoringStrategy` with a versioned model provider.
- Populate interest profiles from consented interaction history and explicit
  user preferences.
- Extend candidate metadata with language, region, quality, and richer topics.
- Configure a durable analytics sink and server-side validation/rate limits.
- Add model evaluation, fairness/diversity monitoring, and offline/online
  experiments before enabling personalized ranking in the production feed.

## Validation boundary

Ranking, freshness, diversity, cache expiry, and analytics delivery semantics
have focused unit tests. Supabase query plans, live personalized event data,
and integration with the existing feed UI remain future verification work.
