# User video upload system

The upload feature is isolated in `frontend/src/features/upload`. Its UI calls
`useVideoUpload`; it does not call Supabase Storage or Pixabay directly.
`uploadService` coordinates preparation and persistence, while `MediaService`
owns the client-side Storage provider boundary.

## Upload flow

1. Select an MP4, MOV, WebM, or M4V file using the picker or drop zone.
2. Validate extension, MIME type when provided, file signature, size, browser
   decodability, duration, and resolution.
3. Use the shared media-processing pipeline. FFmpeg WebAssembly is loaded
   lazily and reused in its worker to probe metadata and compress video to MP4
   at 480p, 720p, or 1080p while preserving aspect ratio. Generate a preview
   clip and JPEG thumbnail/poster assets; the user can choose another frame.
4. Create an authenticated `videos` draft through `/api/video-uploads`.
   The route checks `videos:upload` and records title, description, visibility,
   comment permissions, and a feed-compatible caption.
5. Request signed Storage upload targets. Upload the original via resumable
   TUS and upload compressed video and thumbnail to private buckets.
6. Complete the draft through
   `/api/video-uploads/{videoId}/complete`. The server checks draft ownership,
   validates paths and canonical MIME types, verifies each stored object's
   size and stored MIME, writes `video_assets`, links hashtags, and marks the
   video ready. Dimensions and duration are not persisted from client input.
7. Cancel/failure cleanup removes draft asset rows, Storage objects, and the
   draft. Successful completion invalidates the feed query cache.

## Validation and limits

Client validation accepts `.mp4`, `.mov`, `.webm`, and `.m4v`, requires a
matching container signature and readable video stream, limits the source to
200 MB and 10 minutes, and requires at least 360 pixels on the shorter side.
Dimensions above 7680 pixels are rejected. Storage accepts objects up to
500 MB and thumbnails up to 5 MB. Compression profiles target 480p, 720p, and
1080p with bounded bitrates and aspect-preserving dimensions. Titles are
limited to 100 characters, descriptions to 2200 characters, and hashtags to
10 slugs of at most 64 lowercase alphanumeric/underscore characters.

Client metadata is used only for the local preview and processing experience;
it is not used to determine ownership or authorization and is omitted from
persisted video-asset dimensions and duration. The server verifies
authenticated ownership, canonical MIME types, byte sizes, and the stored
objects before the video becomes ready. Stream probing currently occurs in
the browser, so a modified client can still submit content that the server has
not decoded. Add an authoritative server-side probe before treating duration
and dimensions as trusted or persisting them.

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

Unit tests cover client-side resolution/metadata limits, M4V recognition, and
processing pipeline ordering and metadata reuse. Lint, type-check, tests, and
production build validate the repository changes. Applying the migration,
authenticated RLS/permission behavior, Supabase Storage CORS/TUS/signed
uploads, authoritative server-side probing, FFmpeg in real browsers, and
mobile/device behavior still require external integration verification.

Live streaming and video editing are not part of this phase.
