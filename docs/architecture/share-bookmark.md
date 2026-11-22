# Share & Bookmark architecture

## Scope

The feature adds save/remove bookmark controls, a paginated saved-video gallery,
live bookmark synchronization, native sharing with a copy-link fallback, and a
web watch route for canonical video links. It does not add social-network
share targets or persist share counts.

## Bookmark data and authorization

- `public.bookmarks` and `public.toggle_bookmark(uuid)` from the social-core
  migration remain the source of truth. No tables, columns, or RPCs are added.
- The service verifies the active Supabase user matches the expected user
  before writes. Bookmark reads are owner-filtered and protected by the
  existing RLS policy. The existing RPC enforces active-account status and
  video visibility.
- The saved-video query pages 24 bookmark references, fetches visible videos in
  one batch through the feed data service, and signs thumbnails through the
  existing media service. Missing or no-longer-visible videos are omitted.
- There is no `bookmarks_count` column in the current schema, so bookmark
  counts are not displayed or inferred from incomplete client data.
- Mutations use `useOptimisticMutation`; bookmark state changes immediately,
  removals disappear from cached saved pages, failures roll back, and settled
  operations invalidate bookmark and feed queries.

## Realtime

`useBookmarkRealtime` subscribes through the shared subscription registry to
bookmark rows filtered by the current user. The
`20261120001500_bookmarks_realtime.sql` migration idempotently adds the existing
bookmarks table to `supabase_realtime`. The mapper dispatches
`BOOKMARK_CREATED` and `BOOKMARK_REMOVED`; the shared query-sync service
invalidates bookmark caches and matching video state is updated immediately.

Apply the migration after `20261117100000_social_core_schema.sql` and the
existing Realtime migrations. It requires the Supabase Realtime publication.

## Sharing and deep links

- `ShareService` uses `navigator.share` when available. User cancellation is
  treated as cancellation; permission and unexpected failures are surfaced.
- Unsupported browsers open the accessible modal fallback. `ClipboardService`
  uses the Clipboard API and falls back to a temporary selected text field when
  the API is unavailable. Permission failures are reported without claiming
  that a copy succeeded.
- `DeepLinkService` creates an HTTPS canonical URL at `/watch/{videoId}` plus
  the matching `connectly://watch/{videoId}` app URL. The current web route
  renders the existing video preview and respects Supabase visibility rules.
- Native-app universal-link association files and external share targets
  (WhatsApp, Telegram, Facebook, X, Instagram, and QR) remain future work.

Share events are not stored and do not increment a counter. The current schema
does not provide a share-count write path, and the feature avoids inventing
client-side counts that could be duplicated or spoofed.

## Public hooks and components

Exports from `frontend/src/features/share-bookmark/index.ts` include:

- Hooks: `useBookmark`, `useBookmarks`, `useShare`, and `useCopyLink`.
- Components: `BookmarkButton`, `BookmarkAnimation`, `BookmarkGallery`,
  `ShareButton`, `ShareDialog`, `CopyLinkButton`, and `ShareSuccessToast`.
- Services: `BookmarkService`, `BookmarkRealtimeService`, `ShareService`,
  `ClipboardService`, and `DeepLinkService`.

The bookmark gallery uses cursor-like offset pagination and a responsive grid;
its items remain independent of feed virtualization. Realtime subscriptions are
deduplicated per signed-in user by the existing registry.

## Verification boundary

Unit tests cover bookmark cache rollback, Realtime payload mapping, share API
fallback/cancellation/permission handling, and canonical URL validation. The
Supabase migration, RLS behavior, browser share/clipboard APIs, and responsive
device behavior still require verification against the configured project and
target browsers.
