import { compressionService } from '../../upload/services/compressionService';
import type { VideoFormat } from '../../upload/constants/uploadConfig';

export class PreviewGenerator {
  generate(
    file: File,
    sourceFormat: VideoFormat,
    durationSeconds: number,
    signal: AbortSignal,
    onProgress: (percentage: number) => void,
  ): Promise<File> {
    return compressionService.generatePreview(
      file,
      sourceFormat,
      durationSeconds,
      signal,
      onProgress,
    );
  }
}

export const previewGenerator = new PreviewGenerator();
