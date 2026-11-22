import { compressionService } from '../../upload/services/compressionService';

export class FFmpegService {
  get isLoaded(): boolean {
    return compressionService.isLoaded;
  }

  load(signal: AbortSignal): Promise<void> {
    return compressionService.load(signal);
  }

  terminate(): void {
    compressionService.terminate();
  }
}

export const ffmpegService = new FFmpegService();
