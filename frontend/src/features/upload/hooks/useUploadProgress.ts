'use client';

import { useCallback, useState } from 'react';
import type { UploadProgressState } from '../types/upload';

const initialState: UploadProgressState = {
  stage: 'idle',
  percentage: 0,
  bytesUploaded: 0,
  bytesTotal: 0,
};

export function useUploadProgress() {
  const [progress, setProgress] = useState(initialState);

  const update = useCallback(
    (
      stage: UploadProgressState['stage'],
      bytesUploaded: number,
      bytesTotal: number,
    ) => {
      const safeTotal = Math.max(0, bytesTotal);
      const safeUploaded = Math.min(safeTotal, Math.max(0, bytesUploaded));
      setProgress({
        stage,
        bytesUploaded: safeUploaded,
        bytesTotal: safeTotal,
        percentage:
          safeTotal === 0
            ? stage === 'complete'
              ? 100
              : 0
            : Math.round((safeUploaded / safeTotal) * 100),
      });
    },
    [],
  );

  const reset = useCallback(() => setProgress(initialState), []);

  return { progress, reset, update };
}
