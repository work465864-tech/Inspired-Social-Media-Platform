import {
  acceptedVideoFormats,
  uploadBuckets,
  uploadLimits,
} from '../constants/uploadConfig';
import type {
  PreparedVideo,
  UploadProgressState,
  VideoVisibility,
} from '../types/upload';
import { metadataService } from './metadataService';
import { normalizeUploadError, VideoUploadError } from './uploadErrorService';
import { mediaService } from '../../media/mediaService';

export type UploadRequest = {
  prepared: PreparedVideo;
  title: string;
  description: string;
  hashtags: string[];
  visibility: VideoVisibility;
  allowComments: boolean;
};

type UploadProgressCallback = (
  stage: UploadProgressState['stage'],
  bytesUploaded: number,
  bytesTotal: number,
) => void;

export const uploadService = {
  async upload(
    request: UploadRequest,
    signal: AbortSignal,
    onProgress: UploadProgressCallback,
  ): Promise<{ videoId: string; status: 'ready' }> {
    const { prepared } = request;
    if (prepared.original.size > uploadLimits.maxStoredVideoBytes) {
      throw new VideoUploadError(
        'file_too_large',
        'The original video exceeds the Storage limit.',
      );
    }
    if (prepared.compressed.size > uploadLimits.maxStoredVideoBytes) {
      throw new VideoUploadError(
        'file_too_large',
        'The compressed video exceeds the Storage limit.',
      );
    }
    if (prepared.thumbnails.thumbnail.size > uploadLimits.maxThumbnailBytes) {
      throw new VideoUploadError(
        'file_too_large',
        'The generated thumbnail exceeds the Storage limit.',
      );
    }

    const originalFile =
      prepared.original.type ===
      acceptedVideoFormats[prepared.sourceFormat].mimeType
        ? prepared.original
        : new File([prepared.original], prepared.original.name, {
            type: acceptedVideoFormats[prepared.sourceFormat].mimeType,
            lastModified: prepared.original.lastModified,
          });
    mediaService.validateUpload(originalFile, 'original');
    mediaService.validateUpload(prepared.compressed, 'compressed');
    mediaService.validateUpload(prepared.thumbnails.thumbnail, 'thumbnail');

    onProgress(
      'saving',
      0,
      prepared.original.size +
        prepared.compressed.size +
        prepared.thumbnails.thumbnail.size,
    );

    const draft = await metadataService.createDraft(
      {
        title: request.title,
        description: request.description,
        sourceFormat: prepared.sourceFormat,
        visibility: request.visibility,
        allowComments: request.allowComments,
      },
      signal,
    );

    try {
      const signedUploads = await mediaService.getSignedUploadUrl(
        draft.videoId,
        draft.paths,
        signal,
      );
      const totalBytes =
        originalFile.size +
        prepared.thumbnails.thumbnail.size +
        prepared.compressed.size;
      let completedBytes = 0;

      onProgress('uploading-original', 0, totalBytes);
      await mediaService.uploadVideo({
        assetKind: 'original',
        file: originalFile,
        objectPath: draft.paths.original,
        signal,
        onProgress: (sent, total) =>
          onProgress(
            'uploading-original',
            completedBytes + Math.min(sent, total),
            totalBytes,
          ),
      });
      completedBytes += originalFile.size;

      onProgress('uploading-thumbnail', completedBytes, totalBytes);
      await mediaService.uploadThumbnail({
        signedUpload: signedUploads.thumbnail,
        file: prepared.thumbnails.thumbnail,
        objectPath: draft.paths.thumbnail,
        signal,
        onProgress: (sent) =>
          onProgress(
            'uploading-thumbnail',
            completedBytes + Math.min(sent, prepared.thumbnails.thumbnail.size),
            totalBytes,
          ),
      });
      completedBytes += prepared.thumbnails.thumbnail.size;

      onProgress('uploading-compressed', completedBytes, totalBytes);
      await mediaService.uploadVideo({
        assetKind: 'compressed',
        signedUpload: signedUploads.compressed,
        file: prepared.compressed,
        objectPath: draft.paths.compressed,
        signal,
        onProgress: (sent) =>
          onProgress(
            'uploading-compressed',
            completedBytes + Math.min(sent, prepared.compressed.size),
            totalBytes,
          ),
      });
      completedBytes += prepared.compressed.size;

      onProgress('saving', completedBytes, totalBytes);
      const result = await metadataService.complete(
        draft.videoId,
        draft.paths,
        [
          {
            bucketId: uploadBuckets.original,
            objectPath: draft.paths.original,
            mimeType: originalFile.type,
            byteSize: originalFile.size,
          },
          {
            bucketId: uploadBuckets.compressed,
            objectPath: draft.paths.compressed,
            mimeType: prepared.compressed.type,
            byteSize: prepared.compressed.size,
          },
          {
            bucketId: uploadBuckets.thumbnail,
            objectPath: draft.paths.thumbnail,
            mimeType: prepared.thumbnails.thumbnail.type,
            byteSize: prepared.thumbnails.thumbnail.size,
          },
        ],
        request.hashtags,
        signal,
      );
      onProgress('complete', totalBytes, totalBytes);
      return result;
    } catch (error) {
      try {
        await metadataService.cancel(draft.videoId, draft.paths);
      } catch {
        throw new VideoUploadError(
          'storage_error',
          `${normalizeUploadError(error).message} The incomplete upload could not be fully cleaned up.`,
        );
      }

      throw normalizeUploadError(error);
    }
  },
};
