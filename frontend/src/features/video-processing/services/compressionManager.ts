import { compressionService } from '../../upload/services/compressionService';
import type {
  CompressionPreset,
  VideoFormat,
} from '../../upload/constants/uploadConfig';
import type { MediaMetadata } from '../../../types/media';

export class CompressionManager {
  async compress(
    file: File,
    sourceFormat: VideoFormat,
    metadata: MediaMetadata,
    preset: CompressionPreset,
    signal: AbortSignal,
    onProgress: (percentage: number) => void,
  ): Promise<{
    file: File;
    dimensions: { width: number; height: number };
  }> {
    const result = await compressionService.compress(
      file,
      sourceFormat,
      metadata,
      preset,
      signal,
      onProgress,
    );
    return { file: result.file, dimensions: result.dimensions };
  }
}

export const compressionManager = new CompressionManager();
