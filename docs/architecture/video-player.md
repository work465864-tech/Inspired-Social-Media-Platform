# Video player experience

Phase 3.22B adds a provider-neutral vertical playback experience on top of the
existing video provider and player. `VideoFeedPage` continues to own feed,
trending, and search queries; `FeedContainer` owns virtualized presentation,
active-item selection, and feed navigation. Cards consume the shared `Video`
model, so playback and overlays do not depend on Pixabay response shapes.

## Playback pipeline

- `FeedContainer` virtualizes the video list and observes each mounted card
  relative to its scroll root. The card with the greatest visible ratio above
  0.5 becomes active.
- `VideoCard` passes the active state to the reusable `VideoPlayer`; inactive
  players pause. The immediately following card may preload metadata, while
  other off-screen video sources remain unloaded.
- The player starts muted, loops, pauses when outside the viewport, and reuses
  the existing play/pause, volume, seek/progress, replay, fullscreen, buffering,
  and error controls.
- `VideoOverlay`, `VideoDescription`, and `VideoActions` display normalized
  creator and caption data, tags, provider attribution, and playback actions.

## Gestures and accessibility

`GestureHandler` supports vertical touch swipes, desktop wheel navigation, and
Arrow/Page Up/Down feed navigation. Interactive controls are excluded from
feed gestures. Space remains available to the focused player for play/pause.
The feed and player expose accessible labels and keyboard instructions;
controls keep visible focus styles. Reduced-motion preferences disable or
shorten nonessential transitions.

Double-tapping the video surface displays a like burst and marks the demo video
as liked. Like and bookmark state are local presentation state; comments are
unavailable for demo content. The current Pixabay model has no audio-track
metadata, so the overlay reports that audio details are unavailable rather
than inventing a track name.

## Boundaries and verification

No authentication, schema, recommendation, search, notification, or upload
behavior is changed. The UI continues to load videos through the same-origin
video-provider API and preserves provider attribution.

Gesture direction thresholds have unit coverage. Browser autoplay policies,
actual media availability, visual behavior, and touch behavior still require
verification in supported mobile and desktop browsers. Autoplay may be blocked
by the browser or device; the visible player controls remain available for
manual playback.
