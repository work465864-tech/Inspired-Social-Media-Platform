# Media processing pipeline

Media processing is implemented in
`frontend/src/features/video-processing` and runs before the upload service
persists assets. `useVideoUpload` delegates to `useMediaProcessor`; upload UI
components consume a provider-independent `VideoProcessingResult`.

## Pipeline

1. Validate file size, extension, MIME hint, container signature, browser
   decodability, duration, and resolution.
2. Lazily load the cached FFmpeg WebAssembly worker and extract stream metadata:
   duration, dimensions, aspect ratio, codecs, frame rate, bitrate, and source
   size.
3. Validate the probed metadata and compress to MP4 using a 480p, 720p, or
   1080p profile. Output sizing preserves aspect ratio and is even-dimensioned
   for encoder compatibility; bitrate caps bound output size.
4. Generate JPEG thumbnail and poster variants, then a short preview clip.
   The upload dialog lets the user scrub the source video and regenerate the
   thumbnail from a selected frame.
5. Return the compressed video, dimensions, metadata, generated assets, and a
   typed publish-preparation package to the existing upload flow.

Supported input containers are MP4, MOV, WebM, and M4V. M4V originals are
stored with the compatible `video/mp4` MIME type. Unsupported extensions,
signature mismatches, unsupported codecs, invalid metadata, worker failures,
and memory-limit errors are surfaced through typed processing errors.

## Runtime and performance

The upload path reuses the existing FFmpeg instance/worker exposed through
`FFmpegService`; core JavaScript and WASM are loaded only after file validation.
Compression and metadata probing run in FFmpeg's worker, and the same FFprobe
metadata is passed to compression to avoid a second metadata probe. Operations
are serialized around the shared FFmpeg filesystem, temporary job files are
cleaned after each operation, and abort signals terminate active processing.
The browser handles lightweight file validation and frame display; no separate
FFmpeg instance is created by the UI.

## Metadata trust boundary

The browser-generated metadata is useful for preview, compression, and local
validation, but is not authoritative. The upload completion API accepts asset
identity, canonical MIME, and size declarations, verifies those declarations
against the owned Storage objects, and does not persist client-supplied
dimensions or duration. These database fields remain null until the server can
decode the uploaded media and establish authoritative metadata.

Current finalization verifies ownership, object paths, stored object size, and
stored MIME type, but does not independently decode the video stream. A
production server-side probe is still required to reject forged/corrupted media
and to persist trusted duration and dimensions. Browser-side validation is not
a security boundary.

## Verification

Focused tests cover M4V MIME recognition, metadata validation limits, and
pipeline ordering/metadata reuse. Lint, TypeScript, full test, and production
build commands should be run from `frontend`. Authenticated Supabase Storage
and real-browser/device behavior need deployment-level verification.

Live streaming and AI editing are out of scope.
