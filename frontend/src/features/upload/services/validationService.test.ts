import { describe, expect, it } from 'vitest';
import {
  validateMediaMetadata,
  validateVideoResolution,
  validationService,
} from './validationService';
import { VideoUploadError } from './uploadErrorService';
import type { MediaMetadata } from '../../../types/media';

const validMetadata: MediaMetadata = {
  durationMs: 5_000,
  width: 640,
  height: 360,
  aspectRatio: 640 / 360,
  frameRate: 30,
  videoCodec: 'h264',
  audioCodec: 'aac',
  bitrateBps: 1_000_000,
  fileSizeBytes: 1_000,
  orientation: 'landscape',
};

describe('video resolution validation', () => {
  it('accepts landscape and portrait video at the minimum short-side size', () => {
    expect(() => validateVideoResolution(640, 360)).not.toThrow();
    expect(() => validateVideoResolution(360, 640)).not.toThrow();
  });

  it('rejects video below the minimum resolution', () => {
    expect(() => validateVideoResolution(480, 270)).toThrow(
      expect.objectContaining<Partial<VideoUploadError>>({
        code: 'resolution_too_low',
      }),
    );
  });

  it('rejects video above the maximum resolution', () => {
    expect(() => validateVideoResolution(7681, 4320)).toThrow(
      expect.objectContaining<Partial<VideoUploadError>>({
        code: 'resolution_exceeded',
      }),
    );
  });

  it('validates probed metadata against the requested duration limit', () => {
    expect(() =>
      validateMediaMetadata(validMetadata, { maxDurationSeconds: 4 }),
    ).toThrow(
      expect.objectContaining<Partial<VideoUploadError>>({
        code: 'duration_exceeded',
      }),
    );
  });

  it('rejects non-integer dimensions in probed metadata', () => {
    expect(() =>
      validateMediaMetadata({ ...validMetadata, width: Number.NaN }),
    ).toThrow(
      expect.objectContaining<Partial<VideoUploadError>>({
        code: 'corrupted_file',
      }),
    );
  });

  it('recognizes M4V MIME types before validating container signatures', async () => {
    const file = new File([new Uint8Array(16)], 'sample.m4v', {
      type: 'video/x-m4v',
    });

    await expect(
      validationService.validateFile(file, new AbortController().signal),
    ).rejects.toThrow(
      'The file content does not match an MP4, MOV, WebM, or M4V video.',
    );
  });
});
