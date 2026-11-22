import {
  acceptedVideoFormats,
  uploadLimits,
  type VideoFormat,
} from '../constants/uploadConfig';
import type { VideoProbeMetadata } from '../types/upload';
import type { MediaMetadata } from '../../../types/media';
import { VideoUploadError } from './uploadErrorService';

export type VideoValidationOptions = {
  maxFileSizeBytes?: number;
  maxDurationSeconds?: number;
  minResolution?: number;
  maxResolution?: number;
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

  const format = acceptedVideoFormats[extension];
  const acceptedMimeTypes: readonly string[] = format.acceptedMimeTypes;
  if (file.type && !acceptedMimeTypes.includes(file.type)) {
    throw new VideoUploadError(
      'unsupported_format',
      'The selected file type does not match its video format.',
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
): Promise<VideoProbeMetadata> {
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
        reject(
          new VideoUploadError(
            'corrupted_file',
            'The video metadata could not be read.',
          ),
        ),
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
          reject(
            new VideoUploadError(
              'corrupted_file',
              'The selected file does not contain a readable video stream.',
            ),
          ),
        );
        return;
      }

      finish(() =>
        resolve({
          durationMs,
          width: video.videoWidth,
          height: video.videoHeight,
        }),
      );
    };
    video.onerror = () =>
      finish(() =>
        reject(
          new VideoUploadError(
            'corrupted_file',
            'The video is damaged or cannot be decoded by this browser.',
          ),
        ),
      );

    signal.addEventListener('abort', abort, { once: true });
    video.src = objectUrl;
  });
}

export function validateVideoResolution(
  width: number,
  height: number,
  minResolution: number = uploadLimits.minResolution,
  maxResolution: number = uploadLimits.maxResolution,
): void {
  if (Math.min(width, height) < minResolution) {
    throw new VideoUploadError(
      'resolution_too_low',
      `Videos must be at least ${minResolution} pixels on their shorter side.`,
    );
  }
  if (width > maxResolution || height > maxResolution) {
    throw new VideoUploadError(
      'resolution_exceeded',
      'The video resolution exceeds the supported limit.',
    );
  }
}

export function validateMediaMetadata(
  metadata: MediaMetadata,
  options: VideoValidationOptions = {},
): void {
  const maxDurationSeconds =
    options.maxDurationSeconds ?? uploadLimits.maxDurationSeconds;
  const minResolution = options.minResolution ?? uploadLimits.minResolution;
  const maxResolution = options.maxResolution ?? uploadLimits.maxResolution;
  if (
    !Number.isInteger(metadata.width) ||
    !Number.isInteger(metadata.height) ||
    metadata.width <= 0 ||
    metadata.height <= 0
  ) {
    throw new VideoUploadError(
      'corrupted_file',
      'The video dimensions could not be verified.',
    );
  }
  if (
    !Number.isFinite(metadata.durationMs) ||
    metadata.durationMs <= 0 ||
    metadata.durationMs > maxDurationSeconds * 1000
  ) {
    throw new VideoUploadError(
      'duration_exceeded',
      `Videos must be ${Math.floor(maxDurationSeconds / 60)} minutes or shorter.`,
    );
  }
  validateVideoResolution(
    metadata.width,
    metadata.height,
    minResolution,
    maxResolution,
  );
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
  ): Promise<{ format: VideoFormat; metadata: VideoProbeMetadata }> {
    const maxFileSizeBytes =
      options.maxFileSizeBytes ?? uploadLimits.maxFileSizeBytes;
    const maxDurationSeconds =
      options.maxDurationSeconds ?? uploadLimits.maxDurationSeconds;
    const minResolution = options.minResolution ?? uploadLimits.minResolution;
    const maxResolution = options.maxResolution ?? uploadLimits.maxResolution;

    if (file.size <= 0) {
      throw new VideoUploadError(
        'corrupted_file',
        'The selected video file is empty.',
      );
    }
    if (file.size > maxFileSizeBytes) {
      throw new VideoUploadError(
        'file_too_large',
        `Choose a video smaller than ${Math.floor(maxFileSizeBytes / 1024 / 1024)} MB.`,
      );
    }

    const format = getFormat(file);
    await validateSignature(file, format);
    const metadata = await readVideoMetadata(file, signal);

    if (metadata.durationMs > maxDurationSeconds * 1000) {
      throw new VideoUploadError(
        'duration_exceeded',
        `Videos must be ${Math.floor(maxDurationSeconds / 60)} minutes or shorter.`,
      );
    }
    validateVideoResolution(
      metadata.width,
      metadata.height,
      minResolution,
      maxResolution,
    );

    return { format, metadata };
  },
};
