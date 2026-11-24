import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  validateMediaMetadata,
  validateVideoResolution,
  validationService,
} from './validationService';
import { uploadLimits } from '../constants/uploadConfig';
import {
  getCompressionBitrateOptions,
  parsePixelDimension,
  resolvePixelDimension,
} from './compressionService';
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('video resolution validation', () => {
  it('normalizes fractional probed dimensions to whole pixels', () => {
    expect(parsePixelDimension(280.4)).toBe(280);
    expect(parsePixelDimension('157.6')).toBe(158);
    expect(parsePixelDimension(Number.NaN)).toBeNull();
    expect(resolvePixelDimension(undefined, '157.6')).toBe(158);
    expect(resolvePixelDimension(280, 157)).toBe(280);
  });

  it('accepts low-resolution landscape and portrait videos', () => {
    expect(() => validateVideoResolution(280, 157)).not.toThrow();
    expect(() => validateVideoResolution(157, 280)).not.toThrow();
  });

  it('accepts low-resolution video metadata', () => {
    expect(() =>
      validateMediaMetadata({
        ...validMetadata,
        width: 280,
        height: 157,
      }),
    ).not.toThrow();
  });

  it('rejects dimensions that are missing or invalid', () => {
    expect(() => validateVideoResolution(0, 360)).toThrow(
      expect.objectContaining<Partial<VideoUploadError>>({
        code: 'corrupted_file',
      }),
    );
  });

  it('allows original videos up to 1 GiB', () => {
    expect(uploadLimits.maxFileSizeBytes).toBe(1024 * 1024 * 1024);
  });

  it('accepts files at the configured size limit and rejects larger files', async () => {
    const signal = new AbortController().signal;
    const atLimit = new File([new Uint8Array(16)], 'sample.mp4');
    const aboveLimit = new File([new Uint8Array(17)], 'sample.mp4');

    await expect(
      validationService.validateFile(atLimit, signal, {
        maxFileSizeBytes: atLimit.size,
      }),
    ).rejects.toThrow(
      'The file content does not match an MP4, MOV, WebM, or M4V video.',
    );
    await expect(
      validationService.validateFile(aboveLimit, signal, {
        maxFileSizeBytes: atLimit.size,
      }),
    ).rejects.toThrow(
      expect.objectContaining<Partial<VideoUploadError>>({
        code: 'file_too_large',
      }),
    );
  });

  it('accepts long-duration and high-resolution metadata', () => {
    expect(() =>
      validateMediaMetadata({
        ...validMetadata,
        durationMs: 24 * 60 * 60 * 1000,
        width: 16_384,
        height: 8_640,
        aspectRatio: 16_384 / 8_640,
      }),
    ).not.toThrow();
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

  it('falls back to FFmpeg metadata when HTML video decoding is unavailable', async () => {
    const video = {
      preload: '',
      onloadedmetadata: null as (() => void) | null,
      onerror: null as (() => void) | null,
      duration: Number.NaN,
      videoWidth: 0,
      videoHeight: 0,
      removeAttribute: vi.fn(),
      load: vi.fn(),
      set src(_value: string) {
        this.onerror?.();
      },
    };
    vi.stubGlobal('document', { createElement: () => video });
    vi.stubGlobal('window', {
      setTimeout: () => 1,
      clearTimeout: vi.fn(),
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const signature = new Uint8Array([
      0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0,
    ]);

    const result = await validationService.validateFile(
      new File([signature], 'sample.mp4', { type: 'application/octet-stream' }),
      new AbortController().signal,
    );

    expect(result.format).toBe('mp4');
    expect(result.metadata).toBeNull();
    expect(result.metadataIssue).toContain('browser could not decode');
  });

  it('reduces bitrate for long videos to fit the Storage derivative limit', () => {
    const bitrate = getCompressionBitrateOptions('high', 24 * 60 * 60 * 1000);
    expect(bitrate.audioBitrateKbps).toBeLessThan(128);
    expect(bitrate.videoMaxrateKbps).toBeLessThan(5_000);
  });
});
