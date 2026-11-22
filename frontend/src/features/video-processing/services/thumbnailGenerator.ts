import { thumbnailService } from '../../upload/services/thumbnailService';
import type { GeneratedThumbnails } from '../types/processing';

export class ThumbnailGenerator {
  async generate(
    file: File,
    durationMs: number,
    signal: AbortSignal,
    captureTimeMs?: number,
  ): Promise<GeneratedThumbnails> {
    const generated = await thumbnailService.create(
      file,
      durationMs,
      signal,
      captureTimeMs,
    );
    return {
      primary: generated.thumbnail,
      poster: generated.poster,
      variants: [generated.thumbnail, generated.poster],
      width: generated.width,
      height: generated.height,
      captureTimeMs: generated.captureTimeMs,
    };
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();
