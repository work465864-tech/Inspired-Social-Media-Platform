import type { ThumbnailVariants } from '../types/upload';
import { VideoUploadError } from './uploadErrorService';

const thumbnailDimension = 320;
const previewDimension = 640;

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  quality: number,
): Promise<File> {
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = width;
  scaledCanvas.height = height;
  const context = scaledCanvas.getContext('2d');
  if (!context) {
    throw new VideoUploadError(
      'thumbnail_failed',
      'Your browser could not draw a video thumbnail.',
    );
  }
  context.drawImage(canvas, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    scaledCanvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(
            new VideoUploadError(
              'thumbnail_failed',
              'Your browser could not encode the video thumbnail.',
            ),
          );
        }
      },
      'image/jpeg',
      quality,
    );
  });
  if (!blob.size) {
    throw new VideoUploadError(
      'thumbnail_failed',
      'The generated thumbnail is empty.',
    );
  }
  return new File([blob], 'connectly-thumbnail.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export const thumbnailService = {
  async create(
    file: File,
    durationMs: number,
    signal: AbortSignal,
    captureTimeMs?: number,
  ): Promise<ThumbnailVariants> {
    if (signal.aborted) {
      throw new VideoUploadError(
        'cancelled',
        'Thumbnail generation was cancelled.',
      );
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeout = window.setTimeout(() => {
          finish(() =>
            reject(
              new VideoUploadError(
                'corrupted_file',
                'A video thumbnail could not be generated.',
              ),
            ),
          );
        }, 20_000);
        const cleanup = () => {
          window.clearTimeout(timeout);
          signal.removeEventListener('abort', abort);
          video.onloadedmetadata = null;
          video.onloadeddata = null;
          video.onseeked = null;
          video.onerror = null;
        };
        const finish = (callback: () => void) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          callback();
        };
        const abort = () =>
          finish(() =>
            reject(
              new VideoUploadError(
                'cancelled',
                'Thumbnail generation was cancelled.',
              ),
            ),
          );

        video.onerror = () =>
          finish(() =>
            reject(
              new VideoUploadError(
                'corrupted_file',
                'This video frame could not be decoded.',
              ),
            ),
          );
        video.onloadedmetadata = () => {
          const defaultTime = Math.min((durationMs / 1000) * 0.2, 1.5);
          const requestedTime = captureTimeMs ?? defaultTime * 1000;
          video.currentTime = Math.min(
            Math.max(requestedTime / 1000, 0),
            Math.max(0, video.duration - 0.05),
          );
        };
        video.onloadeddata = () => {
          if (video.currentTime === 0) {
            finish(resolve);
          }
        };
        video.onseeked = () => finish(resolve);
        signal.addEventListener('abort', abort, { once: true });
        video.src = objectUrl;
      });

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = sourceWidth;
      sourceCanvas.height = sourceHeight;
      const context = sourceCanvas.getContext('2d');
      if (!context) {
        throw new VideoUploadError(
          'thumbnail_failed',
          'Your browser could not draw a video thumbnail.',
        );
      }

      context.drawImage(video, 0, 0, sourceWidth, sourceHeight);
      const scale = Math.min(
        1,
        thumbnailDimension / Math.max(sourceWidth, sourceHeight),
      );
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const previewScale = Math.min(
        1,
        previewDimension / Math.max(sourceWidth, sourceHeight),
      );
      const previewWidth = Math.max(1, Math.round(sourceWidth * previewScale));
      const previewHeight = Math.max(
        1,
        Math.round(sourceHeight * previewScale),
      );
      const [thumbnail, poster] = await Promise.all([
        encodeCanvas(sourceCanvas, width, height, 0.78),
        encodeCanvas(sourceCanvas, previewWidth, previewHeight, 0.88),
      ]);
      return {
        thumbnail,
        poster,
        preview: poster,
        width,
        height,
        captureTimeMs: Math.round(video.currentTime * 1000),
      };
    } finally {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  },
};
