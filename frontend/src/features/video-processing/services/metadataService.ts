import { compressionService } from '../../upload/services/compressionService';
import { ffmpegService } from './ffmpegService';
import type { VideoFormat } from '../../upload/constants/uploadConfig';
import type { MediaMetadata } from '../../../types/media';
import type { BrowserMetadataProbe } from '../../upload/services/validationService';
import { VideoUploadError } from '../../upload/services/uploadErrorService';

export class MetadataService {
  async extract(
    file: File,
    sourceFormat: VideoFormat,
    signal: AbortSignal,
    browserProbe: BrowserMetadataProbe = {
      metadata: null,
      metadataIssue: null,
    },
  ): Promise<MediaMetadata> {
    try {
      await ffmpegService.load(signal);
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : '';
      const browserDetail = browserProbe.metadataIssue
        ? ` Browser metadata fallback was unavailable: ${browserProbe.metadataIssue}`
        : '';
      throw new VideoUploadError(
        'compression_failed',
        `FFmpeg failed to initialize${detail}.${browserDetail}`,
      );
    }

    try {
      return await compressionService.inspectMetadata(
        file,
        sourceFormat,
        signal,
        browserProbe.metadata,
      );
    } catch (error) {
      if (!browserProbe.metadataIssue || !(error instanceof VideoUploadError)) {
        throw error;
      }
      throw new VideoUploadError(
        error.code,
        `${error.message} Browser metadata fallback was unavailable: ${browserProbe.metadataIssue}`,
      );
    }
  }
}

export const metadataService = new MetadataService();
