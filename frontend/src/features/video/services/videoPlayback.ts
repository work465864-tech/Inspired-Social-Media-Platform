export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function getMediaErrorMessage(mediaError: MediaError | null): string {
  switch (mediaError?.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'Video loading was interrupted.';
    case MediaError.MEDIA_ERR_NETWORK:
      return 'The video could not be loaded because of a network error.';
    case MediaError.MEDIA_ERR_DECODE:
      return 'This video could not be decoded by the browser.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'This video format is not supported by the browser.';
    default:
      return 'The video could not be played. Try again.';
  }
}

export function getPlaybackErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Playback was blocked by the browser. Press play to start the video.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'The video could not be played. Try again.';
}

export function isAutoplayBlocked(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotAllowedError';
}
