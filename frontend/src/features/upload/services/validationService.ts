import { uploadLimits, type VideoFormat } from '../constants/uploadConfig';
import type { VideoProbeMetadata } from '../types/upload';
import type { MediaMetadata } from '../../../types/media';
import { VideoUploadError } from './uploadErrorService';

export type VideoValidationOptions = {
  maxFileSizeBytes?: number;
};

export type BrowserMetadataProbe = {
  metadata: VideoProbeMetadata | null;
  metadataIssue: string | null;
};

function getFormat(file: File): VideoFormat {
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  if (
    extension !== 'mp4' &&
    extension !== 'mov' &&
    extension !== 'webm' &&
    extension !== 'm4v'
  ) {
    throw new VideoUploadError(
      'unsupported_format',
      'Choose an MP4, MOV, WebM, or M4V video.',
    );
  }

  return extension;
}

async function validateSignature(file: File, format: VideoFormat) {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    throw new VideoUploadError(
      'corrupted_file',
      'The selected video could not be read.',
    );
  }

  const isWebM =
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;
  const isIsoBaseMedia =
    bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';

  if (
    (format === 'webm' && !isWebM) ||
    (format !== 'webm' && !isIsoBaseMedia)
  ) {
    throw new VideoUploadError(
      'unsupported_format',
      'The file content does not match an MP4, MOV, WebM, or M4V video.',
    );
  }
}

function readVideoMetadata(
  file: File,
  signal: AbortSignal,
): Promise<BrowserMetadataProbe> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(
        new VideoUploadError('cancelled', 'Video validation was cancelled.'),
      );
      return;
    }

    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const timeout = window.setTimeout(() => {
      finish(() =>
        resolve({
          metadata: null,
          metadataIssue: 'HTML video metadata timed out after 20 seconds.',
        }),
      );
    }, 20_000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
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
          new VideoUploadError('cancelled', 'Video validation was cancelled.'),
        ),
      );

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const durationMs = Math.round(video.duration * 1000);
      if (
        !Number.isFinite(durationMs) ||
        durationMs <= 0 ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0
      ) {
        finish(() =>
          resolve({
            metadata: null,
            metadataIssue: `HTML video metadata returned invalid duration or dimensions (${video.videoWidth} × ${video.videoHeight}).`,
          }),
        );
        return;
      }

      finish(() =>
        resolve({
          metadata: {
            durationMs,
            width: video.videoWidth,
            height: video.videoHeight,
          },
          metadataIssue: null,
        }),
      );
    };
    video.onerror = () =>
      finish(() =>
        resolve({
          metadata: null,
          metadataIssue:
            'The browser could not decode HTML video metadata; FFmpeg will inspect the file instead.',
        }),
      );

    signal.addEventListener('abort', abort, { once: true });
    video.src = objectUrl;
  });
}

export function validateVideoResolution(width: number, height: number): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new VideoUploadError(
      'corrupted_file',
      `Invalid video dimensions: width=${width}, height=${height}. Expected positive whole-pixel values from FFmpeg or browser metadata.`,
    );
  }
}

export function validateMediaMetadata(metadata: MediaMetadata): void {
  if (
    !Number.isInteger(metadata.width) ||
    !Number.isInteger(metadata.height) ||
    metadata.width <= 0 ||
    metadata.height <= 0
  ) {
    throw new VideoUploadError(
      'corrupted_file',
      `Invalid video dimensions: width=${metadata.width}, height=${metadata.height}. Expected positive whole-pixel values from FFmpeg or browser metadata.`,
    );
  }
  if (!Number.isFinite(metadata.durationMs) || metadata.durationMs <= 0) {
    throw new VideoUploadError(
      'corrupted_file',
      'FFmpeg could not determine a valid video duration.',
    );
  }
  validateVideoResolution(metadata.width, metadata.height);
  if (!Number.isFinite(metadata.fileSizeBytes) || metadata.fileSizeBytes <= 0) {
    throw new VideoUploadError(
      'corrupted_file',
      'The video file size could not be verified.',
    );
  }
}

export const validationService = {
  async validateFile(
    file: File,
    signal: AbortSignal,
    options: VideoValidationOptions = {},
  ): Promise<
    {
      format: VideoFormat;
      metadata: VideoProbeMetadata | null;
    } & BrowserMetadataProbe
  > {
    const maxFileSizeBytes =
      options.maxFileSizeBytes ?? uploadLimits.maxFileSizeBytes;

    if (file.size <= 0) {
      throw new VideoUploadError(
        'corrupted_file',
        'The selected video file is empty.',
      );
    }
    if (file.size > maxFileSizeBytes) {
      throw new VideoUploadError(
        'file_too_large',
        `Choose a video no larger than ${Math.floor(maxFileSizeBytes / 1024 / 1024)} MB.`,
      );
    }

    const format = getFormat(file);
    await validateSignature(file, format);
    let browserMetadata: BrowserMetadataProbe;
    try {
      browserMetadata = await readVideoMetadata(file, signal);
    } catch (error) {
      if (signal.aborted) {
        throw new VideoUploadError(
          'cancelled',
          'Video validation was cancelled.',
        );
      }
      const detail = error instanceof Error ? `: ${error.message}` : '';
      browserMetadata = {
        metadata: null,
        metadataIssue: `HTML video metadata could not be read${detail}.`,
      };
    }
    return { format, ...browserMetadata };
  },
};
