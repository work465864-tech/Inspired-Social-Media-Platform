import { compressionService } from '../../upload/services/compressionService';
import { ffmpegService } from './ffmpegService';
import type { VideoFormat } from '../../upload/constants/uploadConfig';
import type { MediaMetadata } from '../../../types/media';

export class MetadataService {
  extract(
    file: File,
    sourceFormat: VideoFormat,
    signal: AbortSignal,
  ): Promise<MediaMetadata> {
    return ffmpegService
      .load(signal)
      .then(() =>
        compressionService.inspectMetadata(file, sourceFormat, signal),
      );
  }
}

export const metadataService = new MetadataService();
