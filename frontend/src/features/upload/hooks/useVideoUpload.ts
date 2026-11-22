'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedQueryKeys } from '../../feed/constants/queryKeys';
import { useMediaProcessor } from '../../video-processing/hooks/useMediaProcessor';
import { useThumbnailGenerator } from '../../video-processing/hooks/useThumbnailGenerator';
import type { VideoProcessingOptions } from '../../video-processing/types/processing';
import { normalizeUploadError } from '../services/uploadErrorService';
import { uploadService } from '../services/uploadService';
import type {
  PreparedVideo,
  ThumbnailVariants,
  VideoVisibility,
} from '../types/upload';
import { useUploadProgress } from './useUploadProgress';

export type PrepareVideoOptions = VideoProcessingOptions;

export type UploadMetadata = {
  title: string;
  description: string;
  hashtags: string[];
  visibility: VideoVisibility;
  allowComments: boolean;
};

export function useVideoUpload() {
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  const [preparedVideo, setPreparedVideo] = useState<PreparedVideo | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);
  const {
    cancel: cancelProcessing,
    error: processingError,
    process: processMedia,
    progress: processingProgress,
    reset: resetProcessing,
    status: processingStatus,
  } = useMediaProcessor();
  const {
    cancel: cancelThumbnail,
    generate: generateThumbnail,
    isGenerating: isSelectingThumbnail,
    reset: resetThumbnail,
  } = useThumbnailGenerator();
  const { progress, reset: resetUploadProgress, update } = useUploadProgress();
  const isPreparing = processingStatus === 'processing';

  const toThumbnailVariants = useCallback(
    (generated: {
      primary: File;
      poster: File;
      width: number;
      height: number;
      captureTimeMs: number;
    }): ThumbnailVariants => ({
      thumbnail: generated.primary,
      poster: generated.poster,
      preview: generated.poster,
      width: generated.width,
      height: generated.height,
      captureTimeMs: generated.captureTimeMs,
    }),
    [],
  );

  const prepare = useCallback(
    async (
      file: File,
      options: PrepareVideoOptions = {},
    ): Promise<PreparedVideo | null> => {
      controllerRef.current?.abort();
      setError(null);
      setPreparedVideo(null);
      resetUploadProgress();
      resetThumbnail();

      try {
        const processed = await processMedia(file, options);
        const thumbnails = toThumbnailVariants(processed.thumbnails);
        const prepared: PreparedVideo = {
          original: file,
          compressed: processed.compressedVideo,
          previewClip: processed.previewClip,
          thumbnails,
          metadata: processed.metadata,
          sourceMetadata: processed.metadata,
          compressedDimensions: processed.compressedDimensions,
          preset: options.preset ?? 'medium',
          sourceFormat: processed.sourceFormat,
        };
        setPreparedVideo(prepared);
        return prepared;
      } catch (caughtError) {
        const normalized = normalizeUploadError(caughtError);
        setError(normalized);
        return null;
      }
    },
    [resetUploadProgress, processMedia, resetThumbnail, toThumbnailVariants],
  );

  const selectThumbnail = useCallback(
    async (captureTimeMs: number) => {
      if (!preparedVideo) {
        return;
      }
      try {
        const generated = await generateThumbnail(
          preparedVideo.original,
          preparedVideo.metadata.durationMs,
          captureTimeMs,
        );
        setPreparedVideo((current) =>
          current
            ? {
                ...current,
                thumbnails: toThumbnailVariants(generated),
              }
            : current,
        );
      } catch (caughtError) {
        const normalized = normalizeUploadError(caughtError);
        if (normalized.code !== 'cancelled') {
          setError(normalized);
        }
      }
    },
    [generateThumbnail, preparedVideo, toThumbnailVariants],
  );

  const mutation = useMutation({
    mutationFn: async ({
      prepared,
      metadata,
    }: {
      prepared: PreparedVideo;
      metadata: UploadMetadata;
    }) => {
      const controller = controllerRef.current;
      if (!controller || controller.signal.aborted) {
        throw new Error('The upload was cancelled.');
      }
      return uploadService.upload(
        { prepared, ...metadata },
        controller.signal,
        update,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: feedQueryKeys.all });
    },
    onError: (uploadError) => setError(normalizeUploadError(uploadError)),
    retry: (failureCount, uploadError) =>
      failureCount < 2 && normalizeUploadError(uploadError).retryable,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });
  const { mutateAsync, reset: resetMutation } = mutation;

  const upload = useCallback(
    (metadata: UploadMetadata) => {
      if (!preparedVideo) {
        return Promise.reject(
          new Error('Prepare a valid video before uploading.'),
        );
      }
      setError(null);
      controllerRef.current?.abort();
      controllerRef.current = new AbortController();
      return mutateAsync({ prepared: preparedVideo, metadata });
    },
    [mutateAsync, preparedVideo],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    cancelProcessing();
    cancelThumbnail();
  }, [cancelProcessing, cancelThumbnail]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    resetMutation();
    resetUploadProgress();
    resetProcessing();
    resetThumbnail();
    setPreparedVideo(null);
    setError(null);
  }, [resetMutation, resetProcessing, resetThumbnail, resetUploadProgress]);

  return {
    cancel,
    error: error ?? mutation.error ?? processingError,
    isSelectingThumbnail,
    isPreparing,
    isUploading: mutation.isPending,
    prepare,
    preparedVideo,
    preparationProgress: processingProgress.percentage,
    processingError,
    processingStage: processingProgress.stage,
    progress,
    reset,
    selectThumbnail,
    upload,
    uploadError: mutation.error,
  };
}
