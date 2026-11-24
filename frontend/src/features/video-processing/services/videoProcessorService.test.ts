import { afterEach, describe, expect, it, vi } from 'vitest';
import { validationService } from '../../upload/services/validationService';
import { compressionManager } from './compressionManager';
import { metadataService } from './metadataService';
import { previewGenerator } from './previewGenerator';
import { thumbnailGenerator } from './thumbnailGenerator';
import { videoProcessorService } from './videoProcessorService';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('video processor pipeline', () => {
  it('probes and validates media before reusing metadata for compression', async () => {
    const file = new File(['source'], 'source.m4v', { type: 'video/x-m4v' });
    const compressedVideo = new File(['compressed'], 'compressed.mp4', {
      type: 'video/mp4',
    });
    const previewClip = new File(['preview'], 'preview.mp4', {
      type: 'video/mp4',
    });
    const thumbnail = new File(['thumbnail'], 'thumbnail.jpg', {
      type: 'image/jpeg',
    });
    const metadata = {
      durationMs: 5_000,
      width: 640,
      height: 360,
      aspectRatio: 640 / 360,
      frameRate: 30,
      videoCodec: 'h264',
      audioCodec: 'aac',
      bitrateBps: 1_000_000,
      fileSizeBytes: file.size,
      orientation: 'landscape' as const,
    };
    const validate = vi
      .spyOn(validationService, 'validateFile')
      .mockResolvedValue({
        format: 'm4v',
        metadata: { durationMs: metadata.durationMs, width: 640, height: 360 },
        metadataIssue: null,
      });
    const probe = vi
      .spyOn(metadataService, 'extract')
      .mockResolvedValue(metadata);
    const compress = vi
      .spyOn(compressionManager, 'compress')
      .mockResolvedValue({
        file: compressedVideo,
        dimensions: { width: 640, height: 360 },
      });
    const generateThumbnail = vi
      .spyOn(thumbnailGenerator, 'generate')
      .mockResolvedValue({
        primary: thumbnail,
        poster: thumbnail,
        variants: [thumbnail],
        width: 640,
        height: 360,
        captureTimeMs: 1_000,
      });
    const generatePreview = vi
      .spyOn(previewGenerator, 'generate')
      .mockResolvedValue(previewClip);

    const result = await videoProcessorService.process(
      file,
      { preset: 'low' },
      new AbortController().signal,
      () => undefined,
    );

    expect(result.compressedVideo).toBe(compressedVideo);
    expect(result.previewClip).toBe(previewClip);
    expect(result.compressedDimensions).toEqual({ width: 640, height: 360 });
    expect(compress).toHaveBeenCalledWith(
      file,
      'm4v',
      metadata,
      'low',
      expect.any(AbortSignal),
      expect.any(Function),
    );
    const invocationOrder = [
      validate.mock.invocationCallOrder[0],
      probe.mock.invocationCallOrder[0],
      generateThumbnail.mock.invocationCallOrder[0],
      compress.mock.invocationCallOrder[0],
      generatePreview.mock.invocationCallOrder[0],
    ];
    expect(invocationOrder).toEqual(
      [...invocationOrder].sort((left, right) => left - right),
    );
    expect(probe).toHaveBeenCalledWith(
      file,
      'm4v',
      expect.any(AbortSignal),
      expect.objectContaining({ metadataIssue: null }),
    );
  });
});
