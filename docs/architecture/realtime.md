# Realtime architecture

Connectly uses one shared Supabase Realtime service for Postgres Changes and
Presence. `RealtimeProvider` owns the connection, event bus, ref-counted
subscription registry, reconnection manager, and TanStack Query synchronizer.
Feature listeners register through `useSubscription`; duplicate keys share a
channel and are released when the last consumer unmounts.

## Database events

| Source          | Events                 | Client behavior                                                                                                            |
| --------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `videos`        | insert, update, delete | Ignore non-ready inserts; announce ready videos; patch cached counters/captions; remove deleted or no-longer-ready videos. |
| `likes`         | insert, delete         | Dispatch like-added/removed events; video counter updates reconcile absolute counts.                                       |
| `comments`      | insert, update, delete | Reconcile comment lists and invalidate comment-count queries.                                                              |
| `follows`       | insert, update, delete | Dispatch accepted relationship changes and invalidate follow, profile, explore, recommendation, and hybrid-feed queries.   |
| `bookmarks`     | insert, delete         | Invalidate saved-video queries.                                                                                            |
| `notifications` | insert, update         | Refresh recipient notification lists and unread counts; the existing listener handles notification toasts.                 |

`FeedRealtimeService` maps ready database rows into shared events. It ignores
drafts and processing rows and treats a ready-to-not-ready transition as
removal. Duplicate listeners share a channel through the subscription registry;
the hybrid resolver deduplicates video IDs across providers. The client does
not construct provider-facing video objects from raw Realtime rows.

The forward-only
[`20261120110000_follows_realtime.sql`](../../supabase/migrations/20261120110000_follows_realtime.sql)
migration adds `public.follows` to the existing `supabase_realtime`
publication. The current participant-only follow SELECT policy remains the
authorization boundary; client mapping also discards rows that do not involve
the current user.

## Feed and query reconciliation

Hybrid feed queries use
`['video-provider', 'hybrid-feed', userId]`. A ready video insert invalidates
the hybrid feed and trending queries so providers can resolve and deduplicate
the result. Updates immediately patch matching cached video counts and
captions. Content edits and updates for uncached videos schedule feed
reconciliation; repeated update invalidations are coalesced. Deletes remove
the video from every cached provider page and invalidate those queries.
Existing comment, like, follow, bookmark, and notification mutations retain
their optimistic updates and rollback behavior.

Feed items continue to use stable video IDs as virtualizer keys. Before a
structural list change, `FeedContainer` records visible item offsets and
restores the nearest surviving item to the same viewport offset. This prevents
new items, removals, and refreshed ordering from unnecessarily moving the
currently viewed video. Cross-provider feed deduplication remains in the
hybrid resolver.

The `useMyFollowCounts` hook reads accepted follower/following totals for the
signed-in user. Follow changes invalidate the `follows` query prefix so a
mounted count query refreshes. The existing RLS permits participants to read
their own relationships; there is no public aggregate-count RPC, so this hook
does not expose arbitrary users' complete counts.

## Presence and connection lifecycle

`RealtimeSyncListener` tracks authenticated users on the
`connectly:online-users` Presence topic. Presence syncs dispatch online/offline
events with session-local timestamps. Last-seen values are best effort and are
not persisted to profiles. The existing connection manager retries channels,
reports subscription health, and cleans up on unmount or provider disposal.
TanStack Query handles focus/reconnect refetching; inactive cache entries are
invalidated and reconcile when observed again.

Presence is extensible for future status fields, but typing indicators and
chat are not implemented. No custom background-tab polling or persisted
presence history is added.

## Limitations and verification

- Apply the new follows migration before expecting follow events from Supabase.
- Live event delivery, RLS behavior, and reconnects require an authenticated
  Supabase project and have not been verified against a deployed project.
- Upload finalization currently does not persist trusted video dimensions.
  The existing database feed provider requires playable asset dimensions, so
  an upload may not become renderable until a server-side media probe is
  implemented; Realtime intentionally does not trust client-supplied media
  metadata.
- Profile count presentation remains a consumer of `useMyFollowCounts`; this
  phase adds synchronization and the query hook, not a new profile UI.
