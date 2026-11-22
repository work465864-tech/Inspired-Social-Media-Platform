import { videoSchema, type Video } from '../types';

export class VideoNormalizer {
  normalize(value: unknown): Video | null {
    const parsed = videoSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }
}

export const videoNormalizer = new VideoNormalizer();
