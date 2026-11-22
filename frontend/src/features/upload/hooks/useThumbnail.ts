'use client';

import { useCallback, useState } from 'react';
import { thumbnailService } from '../services/thumbnailService';
import type { ThumbnailVariants } from '../types/upload';

export function useThumbnail() {
  const [thumbnail, setThumbnail] = useState<ThumbnailVariants | null>(null);

  const generate = useCallback(
    async (file: File, durationMs: number, signal: AbortSignal) => {
      const result = await thumbnailService.create(file, durationMs, signal);
      setThumbnail(result);
      return result;
    },
    [],
  );
  const reset = useCallback(() => setThumbnail(null), []);

  return {
    generate,
    reset,
    thumbnail,
  };
}
