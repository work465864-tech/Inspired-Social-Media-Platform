import { compressionManager } from './compressionManager';
import { metadataService } from './metadataService';
import { normalizeProcessingError } from './processingErrorService';
import { previewGenerator } from './previewGenerator';
import { publishPreparationService } from './publishPreparationService';
import { thumbnailGenerator } from './thumbnailGenerator';
import {
  validateMediaMetadata,
  validationService,
} from '../../upload/services/validationService';
import type {
  ProcessingProgressCallback,
  ProcessingStage,
  VideoProcessingAdapter,
  VideoProcessingOptions,
  VideoProcessingResult,
} from '../types/processing';

export class VideoProcessorService implements VideoProcessingAdapter {
  async process(
    file: File,
    options: VideoProcessingOptions,
    signal: AbortSignal,
    onProgress: ProcessingProgressCallback,
  ): Promise<VideoProcessingResult> {
    let stage: ProcessingStage = 'validating';
    const updateStage = (nextStage: ProcessingStage, percentage = 0) => {
      stage = nextStage;
      onProgress({ stage, percentage });
    };

    try {
      updateStage('validating');
      const browserProbe = await validationService.validateFile(
        file,
        signal,
        options,
      );

      updateStage('metadata');
      const metadata = await metadataService.extract(
        file,
        browserProbe.format,
        signal,
        browserProbe,
      );
      validateMediaMetadata(metadata);

      updateStage('thumbnail');
      const thumbnails = await thumbnailGenerator.generate(
        file,
        browserProbe.format,
        metadata.durationMs,
        signal,
      );

      updateStage('compression');
      const compressed = await compressionManager.compress(
        file,
        browserProbe.format,
        metadata,
        options.preset ?? 'medium',
        signal,
        (percentage) => onProgress({ stage, percentage }),
      );

      updateStage('preview');
      const previewClip = await previewGenerator.generate(
        file,
        browserProbe.format,
        options.previewDurationSeconds ?? 4,
        signal,
        (percentage) => onProgress({ stage, percentage }),
      );

      updateStage('publish');
      const publishPayload = publishPreparationService.prepare({
        original: file,
        compressedVideo: compressed.file,
        thumbnails,
        previewClip,
        metadata,
      });

      updateStage('completed', 100);
      return {
        sourceFormat: browserProbe.format,
        metadata,
        thumbnails,
        previewClip,
        compressedVideo: compressed.file,
        compressedDimensions: compressed.dimensions,
        publishPayload,
      };
    } catch (error) {
      throw normalizeProcessingError(error, stage);
    }
  }
}

export const videoProcessorService = new VideoProcessorService();

export const defaultVideoProcessingOptions: VideoProcessingOptions = {
  preset: 'medium',
  previewDurationSeconds: 4,
};
