'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import { paths } from '../../../constants/paths.js';
import { useAuth } from '../../auth/hooks/useAuth';
import { DialogSurface } from '../../../components/ui/overlay/DialogSurface';
import { getUploadErrorMessage } from '../services/uploadErrorService';
import type { CompressionPreset } from '../constants/uploadConfig';
import { uploadLimits } from '../constants/uploadConfig';
import type { VideoVisibility } from '../types/upload';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { useVideoUpload } from '../hooks/useVideoUpload';
import {
  CompressionProgress,
  DropZone,
  MediaProcessor,
  ProcessingError,
  ProcessingStatus,
  UploadError,
  UploadProgress,
  UploadQueue,
  UploadSuccess,
} from './UploadComponents';

export function UploadDialog() {
  const router = useRouter();
  const { profile } = useAuth();
  const upload = useVideoUpload();
  const { add, clear, items: queueItems, update } = useUploadQueue();
  const selectedItemId = useRef<string | null>(null);
  const closeStarted = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [preset, setPreset] = useState<CompressionPreset>('medium');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const busy =
    upload.isPreparing || upload.isUploading || upload.isSelectingThumbnail;

  useEffect(() => {
    if (!upload.preparedVideo) {
      setVideoPreviewUrl(null);
      setThumbnailPreviewUrl(null);
      return;
    }

    const videoUrl = URL.createObjectURL(upload.preparedVideo.compressed);
    const thumbnailUrl = URL.createObjectURL(
      upload.preparedVideo.thumbnails.preview,
    );
    setVideoPreviewUrl(videoUrl);
    setThumbnailPreviewUrl(thumbnailUrl);
    return () => {
      URL.revokeObjectURL(videoUrl);
      URL.revokeObjectURL(thumbnailUrl);
    };
  }, [upload.preparedVideo]);

  useEffect(() => {
    const itemId = selectedItemId.current;
    if (!itemId) {
      return;
    }

    if (upload.isPreparing) {
      update(itemId, { status: 'preparing', percentage: 0, error: null });
    } else if (upload.isUploading) {
      update(itemId, {
        status: 'uploading',
        percentage: upload.progress.percentage,
      });
    } else if (uploadedVideoId) {
      update(itemId, { status: 'complete', percentage: 100, error: null });
    } else if (upload.error) {
      update(itemId, {
        status:
          'code' in upload.error && upload.error.code === 'cancelled'
            ? 'cancelled'
            : 'error',
        error: upload.error.message,
      });
    }
  }, [
    upload.error,
    upload.isPreparing,
    upload.isUploading,
    upload.progress.percentage,
    update,
    uploadedVideoId,
  ]);

  const prepareFile = useCallback(
    async (file: File, itemId: string) => {
      setSelectionError(null);
      setUploadedVideoId(null);
      setSelectedFile(file);
      update(itemId, { status: 'preparing', percentage: 0, error: null });
      const prepared = await upload.prepare(file, { preset });
      if (!prepared) {
        update(itemId, {
          status: 'error',
          error: upload.error?.message ?? 'Video preparation failed.',
        });
      } else {
        update(itemId, { status: 'queued', error: null });
      }
    },
    [preset, update, upload],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const itemId = add(file);
      if (!itemId) {
        setSelectionError('This video is already in the upload queue.');
        return;
      }

      selectedItemId.current = itemId;
      await prepareFile(file, itemId);
    },
    [add, prepareFile],
  );

  const startUpload = useCallback(async () => {
    if (!upload.preparedVideo || busy) {
      return;
    }

    const hashtags = hashtagsInput
      .split(/[,\s]+/)
      .map((tag) => tag.replace(/^#/, '').toLowerCase())
      .filter(Boolean)
      .filter((tag, index, tags) => tags.indexOf(tag) === index);
    if (hashtags.length > uploadLimits.maxHashtags) {
      setSelectionError(
        `Use no more than ${uploadLimits.maxHashtags} hashtags.`,
      );
      return;
    }
    if (
      hashtags.some(
        (tag) =>
          tag.length > uploadLimits.maxHashtagLength ||
          !/^[a-z0-9_]+$/.test(tag),
      )
    ) {
      setSelectionError(
        'Hashtags may contain only letters, numbers, and underscores.',
      );
      return;
    }

    try {
      const result = await upload.upload({
        title: title.trim(),
        description: description.trim(),
        hashtags,
        visibility,
        allowComments,
      });
      setUploadedVideoId(result.videoId);
      setSelectionError(null);
    } catch (uploadError) {
      setSelectionError(getUploadErrorMessage(uploadError));
    }
  }, [
    allowComments,
    busy,
    description,
    hashtagsInput,
    title,
    upload,
    visibility,
  ]);

  const retry = useCallback(async () => {
    if (upload.preparedVideo) {
      await startUpload();
    } else if (selectedFile && selectedItemId.current) {
      await prepareFile(selectedFile, selectedItemId.current);
    }
  }, [prepareFile, selectedFile, startUpload, upload.preparedVideo]);

  function closeDialog(open: boolean) {
    if (open || closeStarted.current) {
      return;
    }
    closeStarted.current = true;
    if (busy) {
      upload.cancel();
    }
    router.replace('/feed');
  }

  function resetUpload() {
    upload.reset();
    clear();
    selectedItemId.current = null;
    setSelectedFile(null);
    setUploadedVideoId(null);
    setSelectionError(null);
    setTitle('');
    setDescription('');
    setHashtagsInput('');
  }

  const errorMessage =
    selectionError ??
    (upload.error ? getUploadErrorMessage(upload.error) : null);

  return (
    <DialogSurface
      className="max-w-3xl"
      description="Select a video to validate, compress, preview, and upload."
      onOpenChange={closeDialog}
      open
      title="Upload a video"
    >
      <div className="space-y-5">
        {uploadedVideoId ? (
          <UploadSuccess>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => router.replace('/feed')} size="sm">
                View feed
              </Button>
              <Button
                onClick={() =>
                  router.replace(
                    profile
                      ? paths.creatorProfile(profile.username)
                      : paths.profile,
                  )
                }
                size="sm"
                variant="secondary"
              >
                View profile
              </Button>
              <Button onClick={resetUpload} size="sm" variant="secondary">
                Upload another
              </Button>
            </div>
          </UploadSuccess>
        ) : (
          <>
            <DropZone
              disabled={busy}
              onFile={(file) => void handleFile(file)}
            />
            {selectedFile && (
              <p className="text-xs text-muted">
                Selected:{' '}
                <span className="font-medium">{selectedFile.name}</span>
              </p>
            )}

            {upload.isPreparing &&
              (upload.processingStage === 'compression' ? (
                <CompressionProgress value={upload.preparationProgress} />
              ) : (
                <ProcessingStatus
                  percentage={upload.preparationProgress}
                  stage={upload.processingStage}
                />
              ))}
            {videoPreviewUrl && thumbnailPreviewUrl && upload.preparedVideo && (
              <MediaProcessor
                isSelectingThumbnail={upload.isSelectingThumbnail}
                onSelectThumbnail={(captureTimeMs) =>
                  void upload.selectThumbnail(captureTimeMs)
                }
                preparedVideo={upload.preparedVideo}
                thumbnailUrl={thumbnailPreviewUrl}
                videoUrl={videoPreviewUrl}
              />
            )}

            {selectedFile && !busy && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-foreground">
                  Compression quality
                  <select
                    className="min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    disabled={Boolean(upload.preparedVideo)}
                    onChange={(event) =>
                      setPreset(event.target.value as CompressionPreset)
                    }
                    value={preset}
                  >
                    <option value="low">480p - smallest file</option>
                    <option value="medium">720p - recommended</option>
                    <option value="high">1080p - highest resolution</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-foreground">
                  Who can view this video?
                  <select
                    className="min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onChange={(event) =>
                      setVisibility(event.target.value as VideoVisibility)
                    }
                    value={visibility}
                  >
                    <option value="public">Everyone</option>
                    <option value="followers">Followers</option>
                    <option value="private">Only me</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
                  <input
                    checked={allowComments}
                    className="h-4 w-4 accent-primary"
                    onChange={(event) => setAllowComments(event.target.checked)}
                    type="checkbox"
                  />
                  Allow comments
                </label>
                <label className="space-y-1.5 text-sm font-medium text-foreground">
                  Title
                  <input
                    className="min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    maxLength={uploadLimits.maxTitleLength}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Give your video a title"
                    value={title}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-foreground">
                  Hashtags
                  <input
                    className="min-h-11 w-full rounded-control border border-border bg-canvas px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onChange={(event) => setHashtagsInput(event.target.value)}
                    placeholder="#travel, #design"
                    value={hashtagsInput}
                  />
                  <span className="block text-xs font-normal text-muted">
                    Separate up to {uploadLimits.maxHashtags} hashtags with
                    commas.
                  </span>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
                  Description
                  <textarea
                    className="min-h-24 w-full resize-y rounded-control border border-border bg-canvas px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    maxLength={uploadLimits.maxCaptionLength}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Add a description"
                    value={description}
                  />
                  <span className="block text-right text-xs font-normal text-muted">
                    {description.length}/{uploadLimits.maxCaptionLength}
                  </span>
                </label>
              </div>
            )}

            {upload.isUploading && (
              <UploadProgress progress={upload.progress} />
            )}
            {errorMessage &&
              (upload.processingError ? (
                <ProcessingError
                  message={errorMessage}
                  onRetry={
                    selectedFile && !busy ? () => void retry() : undefined
                  }
                />
              ) : (
                <UploadError
                  message={errorMessage}
                  onRetry={
                    selectedFile && !busy ? () => void retry() : undefined
                  }
                />
              ))}
            <UploadQueue items={queueItems} />

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
              {busy && (
                <Button onClick={upload.cancel} variant="secondary">
                  Cancel
                </Button>
              )}
              {upload.error && !busy && (
                <Button onClick={resetUpload} variant="ghost">
                  Choose another video
                </Button>
              )}
              <Button
                disabled={!upload.preparedVideo || busy || !title.trim()}
                onClick={() => void startUpload()}
              >
                {upload.isUploading ? 'Uploading…' : 'Upload video'}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogSurface>
  );
}
