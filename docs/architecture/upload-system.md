# User video upload system

The upload feature is isolated in `frontend/src/features/upload`. Its UI calls
`useVideoUpload`; it does not call Supabase Storage or Pixabay directly.
`uploadService` coordinates preparation and persistence, while `MediaService`
owns the client-side Storage provider boundary.

## Upload flow

1. Select an MP4, MOV, WebM, or M4V file using the picker or drop zone.
2. Validate extension, container signature, non-empty size, and the Supabase
   per-object size ceiling. Browser MIME and HTML metadata are best-effort only.
3. Use the shared media-processing pipeline. FFmpeg WebAssembly is loaded
   lazily and reused in its worker to probe metadata. FFmpeg metadata is
   preferred; available HTML metadata fills fields omitted by FFmpeg. Generate
   a preview clip and JPEG thumbnail/poster assets; browser frame decoding
   falls back to FFmpeg.
4. Compress to MP4 at 480p, 720p, or 1080p while preserving aspect ratio.
   Long videos get a lower bitrate to target the stored derivative size limit.
5. Create an authenticated `videos` draft through `/api/video-uploads`.
   The route checks `videos:upload` and records title, description, visibility,
   comment permissions, and a feed-compatible caption.
6. Request signed Storage upload targets. Upload the original via resumable
   TUS and upload compressed video and thumbnail to private buckets.
7. Complete the draft through
   `/api/video-uploads/{videoId}/complete`. The server checks draft ownership,
   validates paths and canonical MIME types, verifies each stored object's
   size and stored MIME, writes `video_assets`, links hashtags, and marks the
   video ready. Dimensions and duration are not persisted from client input.
8. Cancel/failure cleanup removes draft asset rows, Storage objects, and the
   draft. Successful completion invalidates the feed query cache.

## Validation and limits

Client validation accepts `.mp4`, `.mov`, `.webm`, and `.m4v` and checks the
container signature. MIME hints are not trusted because browsers and operating
systems may report generic types. There is no application duration or
resolution cutoff; metadata still needs a positive duration and valid frame
dimensions. Compression scales to a 480p, 720p, or 1080p profile while
preserving aspect ratio and reduces bitrate for long videos to target an output
below the storage limit.

The Supabase video buckets and application enforce a maximum of 1 GiB per
object (1,073,741,824 bytes), raised by
`20261123100000_expand_video_upload_limit.sql`. This is a storage constraint,
not an unlimited-upload promise. A
Supabase project-level maximum upload size below the bucket limit can still
reject an upload and must be checked in project settings. Thumbnails are
limited to 5 MiB. Titles are limited to 100 characters, descriptions to 2200
characters, and hashtags to 10 slugs of at most 64 lowercase
alphanumeric/underscore characters.

Client metadata is used only for local preview and processing; it is not used
to determine ownership or authorization and is omitted from persisted
video-asset dimensions and duration. The server verifies authenticated
ownership, canonical MIME types, byte sizes, and stored objects before the
video becomes ready. Stream probing currently occurs in the browser, so a
modified client can still submit content that the server has not decoded. Add
an authoritative server-side probe before treating duration and dimensions as
trusted or persisting them.

## Storage layout

The existing Supabase buckets are reused without creating new buckets:

- `videos-original/{userId}/{videoId}/{uuid}-original.{mp4|mov|webm|m4v}`
- `videos-compressed/{userId}/{videoId}/{uuid}-compressed.mp4`
- `thumbnails/{userId}/{videoId}/{uuid}-thumbnail.jpg`

Buckets remain private. Uploads use short-lived signed targets; the service-role
key is only read by server routes and is never exposed to the browser. Existing
Storage policies continue to constrain owner access and published derivative
visibility.
The FFmpeg core JavaScript and WebAssembly files are public static assets and
are excluded from the authentication proxy matcher so its worker can fetch
them without being redirected to the login page.

## Retry, cancellation, and errors

Original uploads use TUS chunking, persisted fingerprints, and bounded retry
delays. Derivative uploads have bounded retries. Abort signals cancel browser
processing and active uploads. A preparation retry reuses the selected queue
item instead of attempting to enqueue the same file again. FFmpeg errors retain
a short underlying diagnostic message so asset-loading and codec failures can
be distinguished.

## Database and feed integration

`20261120100000_upload_video_metadata.sql` adds title and description columns
to the existing `videos` table. The legacy `caption` is set to the description
to preserve feed behavior. Hashtags use the existing `hashtags` and
`video_hashtags` tables. Ready videos are discoverable through the database
provider in the hybrid feed; no feed UI or provider code depends on the upload
implementation.

## Verification boundary

Unit tests cover file signatures, browser-to-FFmpeg metadata fallback,
dimension normalization, long-duration/high-resolution acceptance, adaptive
bitrate, and processing order. Lint, type-check, tests, and production build
validate repository changes. Authenticated RLS/permission behavior, Supabase
project-level upload limits, real 1 GiB TUS/signed uploads, authoritative
server-side probing, FFmpeg in real browsers, and mobile/device behavior
require external integration verification.

Live streaming and video editing are not part of this phase.
