'use client';

import {
  CheckCircle2,
  FileVideo2,
  ImageIcon,
  LoaderCircle,
  UploadCloud,
} from 'lucide-react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { uploadLimits } from '../constants/uploadConfig';
import type { MediaMetadata } from '../../../types/media';
import type { ProcessingStage } from '../../video-processing/types/processing';
import type {
  PreparedVideo,
  UploadProgressState,
  UploadQueueItem,
} from '../types/upload';

export function DropZone({
  disabled = false,
  onFile,
}: {
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) {
      onFile(file);
    }
    event.currentTarget.value = '';
  }

  function dropFile(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      const file = event.dataTransfer.files[0];
      if (file) {
        onFile(file);
      }
    }
  }

  return (
    <div>
      <input
        accept=".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm,video/x-m4v"
        className="sr-only"
        disabled={disabled}
        id={inputId}
        onChange={chooseFile}
        ref={inputRef}
        type="file"
      />
      <button
        aria-describedby={`${inputId}-help`}
        aria-label="Choose an MP4, MOV, WebM, or M4V video"
        className={cn(
          'flex min-h-44 w-full flex-col items-center justify-center rounded-card border-2 border-dashed px-5 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-canvas hover:border-primary/60 hover:bg-primary/5',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropFile}
        type="button"
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <UploadCloud aria-hidden="true" className="h-6 w-6" />
        </span>
        <span className="mt-4 text-sm font-semibold text-foreground">
          Drop your video here or browse
        </span>
        <span className="mt-1 text-xs text-muted" id={`${inputId}-help`}>
          MP4, MOV, WebM, or M4V · minimum 360 px on the shorter side · up to{' '}
          {Math.floor(uploadLimits.maxFileSizeBytes / 1024 / 1024)} MB
        </span>
      </button>
    </div>
  );
}

export function VideoPreview({
  poster,
  src,
}: {
  poster?: string;
  src: string;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-black">
      <video
        aria-label="Compressed video preview"
        className="max-h-[55dvh] w-full object-contain"
        controls
        muted
        playsInline
        poster={poster}
        preload="metadata"
        src={src}
      />
    </div>
  );
}

export function ThumbnailPreview({
  alt = 'Generated video thumbnail preview',
  src,
}: {
  alt?: string;
  src: string;
}) {
  return (
    <figure className="overflow-hidden rounded-control border border-border bg-surface">
      <img alt={alt} className="aspect-video w-full object-cover" src={src} />
      <figcaption className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
        <ImageIcon aria-hidden="true" className="h-4 w-4" />
        Thumbnail, poster, and preview image
      </figcaption>
    </figure>
  );
}

export function ThumbnailSelector({
  captureTimeMs,
  durationMs,
  file,
  isGenerating,
  onSelect,
}: {
  captureTimeMs: number;
  durationMs: number;
  file: File;
  isGenerating: boolean;
  onSelect: (captureTimeMs: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [selectedTimeMs, setSelectedTimeMs] = useState(captureTimeMs);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setSelectedTimeMs(captureTimeMs);
  }, [captureTimeMs]);

  function seekTo(timeMs: number) {
    setSelectedTimeMs(timeMs);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(timeMs / 1000, video.duration);
    }
  }

  return (
    <section
      aria-label="Choose a thumbnail frame"
      className="space-y-3 rounded-control border border-border bg-surface p-3"
    >
      <h3 className="text-sm font-semibold text-foreground">
        Choose thumbnail frame
      </h3>
      {sourceUrl && (
        <video
          aria-label="Thumbnail frame preview"
          className="max-h-40 w-full rounded-control bg-black object-contain"
          muted
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = Math.min(
              selectedTimeMs / 1000,
              event.currentTarget.duration,
            );
          }}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={sourceUrl}
        />
      )}
      <label className="block space-y-1.5 text-xs text-muted">
        <span className="flex justify-between gap-2">
          <span>Frame position</span>
          <span className="tabular-nums">
            {(selectedTimeMs / 1000).toFixed(1)}s
          </span>
        </span>
        <input
          aria-label="Thumbnail frame position"
          className="w-full accent-primary"
          max={Math.max(durationMs, 0)}
          min={0}
          onChange={(event) => seekTo(Number(event.currentTarget.value))}
          step={500}
          type="range"
          value={selectedTimeMs}
        />
      </label>
      <button
        className="min-h-10 rounded-control border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isGenerating}
        onClick={() => onSelect(selectedTimeMs)}
        type="button"
      >
        {isGenerating ? 'Generating frame…' : 'Use this frame'}
      </button>
    </section>
  );
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatFileSize(fileSizeBytes: number): string {
  return `${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export function VideoMetadataCard({ metadata }: { metadata: MediaMetadata }) {
  const values = [
    ['Duration', formatDuration(metadata.durationMs)],
    ['Resolution', `${metadata.width} × ${metadata.height}`],
    ['Aspect ratio', `${metadata.aspectRatio.toFixed(2)}:1`],
    [
      'Frame rate',
      metadata.frameRate ? `${metadata.frameRate.toFixed(2)} fps` : 'Unknown',
    ],
    ['Video codec', metadata.videoCodec.toUpperCase()],
    ['Audio codec', metadata.audioCodec?.toUpperCase() ?? 'None'],
    [
      'Bitrate',
      metadata.bitrateBps
        ? `${(metadata.bitrateBps / 1_000_000).toFixed(2)} Mbps`
        : 'Unknown',
    ],
    ['Original file size', formatFileSize(metadata.fileSizeBytes)],
  ] as const;

  return (
    <section
      aria-label="Video metadata"
      className="rounded-control border border-border bg-surface p-3"
    >
      <h3 className="text-sm font-semibold text-foreground">Video details</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {values.map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="truncate font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function MediaProcessor({
  isSelectingThumbnail,
  onSelectThumbnail,
  preparedVideo,
  thumbnailUrl,
  videoUrl,
}: {
  isSelectingThumbnail: boolean;
  onSelectThumbnail: (captureTimeMs: number) => void;
  preparedVideo: PreparedVideo;
  thumbnailUrl: string;
  videoUrl: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(12rem,0.7fr)]">
        <VideoPreview poster={thumbnailUrl} src={videoUrl} />
        <ThumbnailPreview src={thumbnailUrl} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ThumbnailSelector
          captureTimeMs={preparedVideo.thumbnails.captureTimeMs}
          durationMs={preparedVideo.metadata.durationMs}
          file={preparedVideo.original}
          isGenerating={isSelectingThumbnail}
          onSelect={onSelectThumbnail}
        />
        <VideoMetadataCard metadata={preparedVideo.sourceMetadata} />
      </div>
    </div>
  );
}

const processingStageLabels: Record<ProcessingStage, string> = {
  queued: 'Waiting to process',
  validating: 'Validating video',
  metadata: 'Reading video information',
  compression: 'Compressing video',
  thumbnail: 'Generating thumbnail',
  preview: 'Preparing preview',
  publish: 'Preparing upload package',
  completed: 'Video processing complete',
};

export function ProcessingStatus({
  percentage,
  stage,
}: {
  percentage: number;
  stage: ProcessingStage;
}) {
  const label = processingStageLabels[stage];

  return (
    <div aria-live="polite" className="space-y-2" role="status">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
          />
          {label}
        </span>
        <span className="tabular-nums text-muted">{percentage}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className="h-2 overflow-hidden rounded-full bg-surface"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

const progressLabels: Record<UploadProgressState['stage'], string> = {
  idle: 'Ready to upload',
  validating: 'Validating video',
  compressing: 'Compressing video',
  'uploading-original': 'Uploading original video',
  'uploading-thumbnail': 'Uploading thumbnail',
  'uploading-compressed': 'Uploading compressed video',
  saving: 'Saving video information',
  complete: 'Upload complete',
};

export function UploadProgress({
  progress,
}: {
  progress: UploadProgressState;
}) {
  const label = progressLabels[progress.stage];

  return (
    <div aria-live="polite" className="space-y-2" role="status">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted">{progress.percentage}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress.percentage}
        className="h-2 overflow-hidden rounded-full bg-surface"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}

export function CompressionProgress({ value }: { value: number }) {
  return (
    <div aria-live="polite" className="space-y-2" role="status">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
          />
          Compressing video in a background worker
        </span>
        <span className="tabular-nums text-muted">{value}%</span>
      </div>
      <div
        aria-label="Video compression progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full bg-surface"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function UploadSuccess({ children }: { children?: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className="rounded-control border border-success/30 bg-success/10 p-4 text-sm text-foreground"
      role="status"
    >
      <p className="flex items-center gap-2 font-semibold">
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" />
        Your video was uploaded successfully.
      </p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function UploadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      aria-live="assertive"
      className="rounded-control border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
      role="alert"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          className="mt-3 rounded-sm font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function ProcessingError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-danger">
        Video processing failed
      </p>
      <UploadError message={message} onRetry={onRetry} />
    </div>
  );
}

export function UploadQueue({ items }: { items: UploadQueueItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-label="Upload queue" className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Upload queue</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            className="flex min-w-0 items-center gap-3 rounded-control border border-border bg-canvas p-3"
            key={item.id}
          >
            <FileVideo2
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-primary"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.file.name}
              </p>
              <p className="text-xs capitalize text-muted">
                {item.error ?? item.status}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {item.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
