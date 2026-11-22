'use client';

import { useCallback, useState } from 'react';
import { compressionService } from '../services/compressionService';
import type { CompressionPreset, VideoFormat } from '../constants/uploadConfig';
import type { VideoProbeMetadata } from '../types/upload';

export function useCompression() {
  const [progress, setProgress] = useState(0);

  const compress = useCallback(
    async (
      file: File,
      sourceFormat: VideoFormat,
      metadata: VideoProbeMetadata,
      preset: CompressionPreset,
      signal: AbortSignal,
    ) => {
      setProgress(0);
      return compressionService.compress(
        file,
        sourceFormat,
        metadata,
        preset,
        signal,
        setProgress,
      );
    },
    [],
  );
  const reset = useCallback(() => setProgress(0), []);

  return { compress, progress, reset };
}
