# Media infrastructure layer

The provider abstraction lives in `frontend/src/features/media`. Application
code uses `MediaService`; the default provider is Supabase Storage. Provider
selection is configured with `NEXT_PUBLIC_MEDIA_PROVIDER` (defaults to
`supabase`). The factory accepts an injected provider registry for testing and
future adapters. Selecting a provider without a registered adapter fails
explicitly; PeerTube, R2, S3, Bunny, and Local Storage are not implemented yet.

## Provider contract

`MediaProvider` defines video and thumbnail upload/deletion, playback and
thumbnail URL resolution, upload URL signing, and file validation. The
`MediaService` facade delegates operations to the factory-selected provider.
`MediaUrlResolver` centralizes URL options and optional CDN rewriting; it
rewrites only public URLs without query strings, never signed URLs.

Supabase media buckets are private, so playback and thumbnail URLs are signed
and Storage RLS checks access when the URL is created. Thumbnail URLs are
signed in batches to preserve feed performance. The bucket policy and visibility
rules remain unchanged.

## Upload flow

The upload UI and progress stages are unchanged. `uploadService` now validates
the prepared original, compressed video, and thumbnail through `MediaService`,
then asks the provider for signed derivative upload URLs and delegates uploads.
The Supabase adapter reuses the existing authenticated TUS resumable upload for
originals and retrying signed uploads for compressed video and thumbnails.
Draft creation, completion, metadata verification, and failure cleanup still
use the existing server API. Its signing, storage verification, and cleanup
handlers are currently Supabase-specific; the client provider boundary does not
make another storage backend selectable by configuration alone.

Provider deletion is restricted to media assets belonging to an owned draft
with upload permission. The new server endpoint validates video ID, asset kind,
bucket, and path before using the server-only Storage client. Published video
deletion remains outside this phase.

## Errors and performance

Upload failures continue to use the existing `VideoUploadError` contract.
Provider URL/deletion failures use typed `MediaProviderError` values for
network, timeout, permission, invalid input, and provider failures. Signed URL
requests have a bounded timeout. Existing upload retry behavior is retained:
TUS chunking/resume for originals and limited retries for derivatives.

The provider contract is dependency-injectable and supports progress callbacks,
abort signals, and signed upload targets. Background upload and resumable or
chunked implementations for future providers remain adapter-level work; this
phase does not add background tasks or new retry loops.

## Configuration and future providers

- `NEXT_PUBLIC_MEDIA_PROVIDER`: provider ID; currently only `supabase` is
  registered.
- `NEXT_PUBLIC_MEDIA_CDN_URL`: optional HTTPS base URL for future providers'
  public, unsigned URLs. Signed Supabase URLs are never rewritten.
- `signedUrlExpiresInSeconds`: internal configuration, default one hour and
  constrained to a maximum of 24 hours per request.

To add a provider, implement `MediaProvider`, register its factory, and add
provider-specific server handlers for signing, verifying, and deleting assets.
The upload UI and client upload orchestration can then remain unchanged, while
the server selects the matching storage adapter. PeerTube will need a
streaming/catalog adapter rather than assuming it behaves like object storage.

No database schema or SQL migration changes were required.

## Validation boundary

Unit tests cover injected provider selection, URL resolution, uploads,
validation, signed URLs, and protected draft-asset deletion. Supabase
authorization, Storage CORS, and real provider behavior still require
deployment-level verification. Server-side adapters for non-Supabase providers
remain future work.
