import { compressionPresets, uploadLimits } from '../constants/uploadConfig';
import type { CompressionPreset, VideoFormat } from '../constants/uploadConfig';
import type { MediaMetadata } from '../../../types/media';
import type { VideoMetadata, VideoProbeMetadata } from '../types/upload';
import { VideoUploadError } from './uploadErrorService';

type ProbeRecord = {
  streams?: unknown;
  format?: unknown;
};

type ProbeStream = {
  codec_type?: unknown;
  codec_name?: unknown;
  width?: unknown;
  height?: unknown;
  duration?: unknown;
  avg_frame_rate?: unknown;
  r_frame_rate?: unknown;
  bit_rate?: unknown;
};

type CompressionResult = {
  file: File;
  metadata: VideoMetadata;
  dimensions: { width: number; height: number };
};

const supportedVideoCodecs = new Set([
  'av1',
  'h264',
  'hevc',
  'mjpeg',
  'mpeg4',
  'prores',
  'vp8',
  'vp9',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseProbeData(
  value: unknown,
  sourceMetadata: VideoProbeMetadata,
  fileSizeBytes: number,
): VideoMetadata {
  if (!isRecord(value)) {
    throw new VideoUploadError(
      'corrupted_file',
      'FFmpeg could not read the video metadata.',
    );
  }

  const record = value as ProbeRecord;
  const streams = Array.isArray(record.streams)
    ? record.streams.filter(isRecord)
    : [];
  const videoStream = streams.find(
    (stream) => (stream as ProbeStream).codec_type === 'video',
  ) as ProbeStream | undefined;
  const audioStream = streams.find(
    (stream) => (stream as ProbeStream).codec_type === 'audio',
  ) as ProbeStream | undefined;
  const videoCodec =
    typeof videoStream?.codec_name === 'string'
      ? videoStream.codec_name.toLowerCase()
      : '';
  const audioCodec =
    typeof audioStream?.codec_name === 'string'
      ? audioStream.codec_name.toLowerCase()
      : null;
  const format = isRecord(record.format) ? record.format : {};

  if (!videoCodec || !supportedVideoCodecs.has(videoCodec)) {
    throw new VideoUploadError(
      'unsupported_codec',
      'This video codec is not supported. Choose a standard MP4, MOV, WebM, or M4V video.',
    );
  }

  const videoWidth =
    typeof videoStream?.width === 'number' ? videoStream.width : NaN;
  const videoHeight =
    typeof videoStream?.height === 'number' ? videoStream.height : NaN;
  if (
    !Number.isInteger(videoWidth) ||
    !Number.isInteger(videoHeight) ||
    videoWidth !== sourceMetadata.width ||
    videoHeight !== sourceMetadata.height
  ) {
    throw new VideoUploadError(
      'corrupted_file',
      'The video stream metadata is incomplete or inconsistent.',
    );
  }

  const durationSeconds =
    parsePositiveNumber(format.duration) ??
    parsePositiveNumber(videoStream?.duration) ??
    sourceMetadata.durationMs / 1000;
  return {
    durationMs: Math.round(durationSeconds * 1000),
    width: videoWidth,
    height: videoHeight,
    aspectRatio: videoWidth / videoHeight,
    frameRate:
      parseFrameRate(videoStream?.avg_frame_rate) ??
      parseFrameRate(videoStream?.r_frame_rate),
    videoCodec,
    audioCodec,
    bitrateBps:
      parsePositiveNumber(format.bit_rate) ??
      parsePositiveNumber(videoStream?.bit_rate),
    fileSizeBytes,
    orientation:
      videoWidth === videoHeight
        ? 'square'
        : videoWidth > videoHeight
          ? 'landscape'
          : 'portrait',
  };
}

function toBlob(data: Uint8Array, mimeType: string): Blob {
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return new Blob([copy.buffer], { type: mimeType });
}

function parsePositiveNumber(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseFrameRate(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const [numeratorText, denominatorText] = value.split('/');
  const numerator = Number(numeratorText);
  const denominator =
    denominatorText === undefined ? 1 : Number(denominatorText);
  const frameRate = numerator / denominator;
  return Number.isFinite(frameRate) && frameRate > 0 ? frameRate : null;
}

function getCompressionErrorDetail(error: unknown): string | null {
  const cause = error instanceof AggregateError ? error.errors[0] : error;
  const detail =
    cause instanceof Error
      ? cause.message
      : typeof cause === 'string'
        ? cause
        : null;
  const normalized = detail?.replace(/\s+/g, ' ').trim().slice(0, 180);
  return normalized || null;
}

function isMediaMetadata(
  metadata: VideoProbeMetadata | VideoMetadata,
): metadata is VideoMetadata {
  return 'videoCodec' in metadata && 'fileSizeBytes' in metadata;
}

function calculateOutputDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  if (scaledWidth >= scaledHeight) {
    return {
      width: Math.max(2, Math.floor(scaledWidth / 2) * 2),
      height: Math.max(2, Math.round(scaledHeight / 2) * 2),
    };
  }
  return {
    width: Math.max(2, Math.round(scaledWidth / 2) * 2),
    height: Math.max(2, Math.floor(scaledHeight / 2) * 2),
  };
}

function validateProbedMetadata(metadata: VideoMetadata): void {
  if (metadata.durationMs > uploadLimits.maxDurationSeconds * 1000) {
    throw new VideoUploadError(
      'duration_exceeded',
      `Videos must be ${Math.floor(uploadLimits.maxDurationSeconds / 60)} minutes or shorter.`,
    );
  }
  if (Math.min(metadata.width, metadata.height) < uploadLimits.minResolution) {
    throw new VideoUploadError(
      'resolution_too_low',
      `Videos must be at least ${uploadLimits.minResolution} pixels on their shorter side.`,
    );
  }
  if (
    metadata.width > uploadLimits.maxResolution ||
    metadata.height > uploadLimits.maxResolution
  ) {
    throw new VideoUploadError(
      'resolution_exceeded',
      'The video resolution exceeds the supported limit.',
    );
  }
}

function classifyCompressionFailure(
  error: unknown,
  signal: AbortSignal,
  logText: string,
): VideoUploadError {
  if (signal.aborted) {
    return new VideoUploadError('cancelled', 'Compression was cancelled.');
  }
  if (error instanceof VideoUploadError) {
    return error;
  }
  const detail = getCompressionErrorDetail(error) ?? '';
  const diagnostic = `${detail}\n${logText}`.toLowerCase();
  if (
    /out of memory|memory access out of bounds|cannot enlarge memory|allocation failed|memory growth/.test(
      diagnostic,
    )
  ) {
    return new VideoUploadError(
      'memory_limit',
      'This video exceeded the browser processing memory limit. Try a smaller file or a lower resolution.',
    );
  }
  if (
    /worker.*(crash|error|terminated)|worker was terminated/.test(diagnostic)
  ) {
    return new VideoUploadError(
      'worker_crashed',
      'The video processing worker stopped unexpectedly. Retry processing.',
    );
  }
  return new VideoUploadError(
    'compression_failed',
    detail
      ? `The video could not be processed by FFmpeg: ${detail}`
      : 'The video could not be processed by FFmpeg.',
  );
}

class CompressionService {
  private engine: import('@ffmpeg/ffmpeg').FFmpeg | null = null;
  private operationTail: Promise<void> = Promise.resolve();

  get isLoaded(): boolean {
    return this.engine?.loaded ?? false;
  }

  async load(signal: AbortSignal): Promise<void> {
    await this.withExclusiveOperation(async () => {
      await this.getEngine(signal);
    });
  }

  terminate(): void {
    this.engine?.terminate();
    this.engine = null;
  }

  private async withExclusiveOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const previousOperation = this.operationTail;
    let releaseOperation: () => void = () => undefined;
    this.operationTail = new Promise<void>((resolve) => {
      releaseOperation = resolve;
    });
    await previousOperation;
    try {
      return await operation();
    } finally {
      releaseOperation();
    }
  }

  private async getEngine(signal: AbortSignal) {
    if (this.engine?.loaded) {
      return this.engine;
    }

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const engine = new FFmpeg();
    const terminate = () => {
      engine.terminate();
      if (this.engine === engine) {
        this.engine = null;
      }
    };

    signal.addEventListener('abort', terminate, { once: true });
    try {
      await engine.load(
        {
          coreURL: new URL('/ffmpeg/ffmpeg-core.js', window.location.origin)
            .href,
          wasmURL: new URL('/ffmpeg/ffmpeg-core.wasm', window.location.origin)
            .href,
        },
        { signal },
      );
    } catch (error) {
      terminate();
      throw error;
    } finally {
      signal.removeEventListener('abort', terminate);
    }

    this.engine = engine;
    return engine;
  }

  private async withMountedInput<T>(
    file: File,
    sourceFormat: VideoFormat,
    signal: AbortSignal,
    operation: (
      engine: Awaited<ReturnType<typeof this.getEngine>>,
      inputPath: string,
      outputDirectory: string,
    ) => Promise<T>,
  ): Promise<T> {
    let engine: Awaited<ReturnType<typeof this.getEngine>> | null = null;
    let createdJob = false;
    let createdInputDirectory = false;
    let createdOutputDirectory = false;
    let mounted = false;
    let failure: unknown;
    let cleanupFailure: unknown;
    let result: T | null = null;
    const jobPath = `/job-${crypto.randomUUID()}`;
    const inputDirectory = `${jobPath}/input`;
    const outputDirectory = `${jobPath}/output`;
    const inputPath = `${inputDirectory}/source.${sourceFormat}`;

    try {
      engine = await this.getEngine(signal);
      if (signal.aborted) {
        throw new VideoUploadError(
          'cancelled',
          'Video processing was cancelled.',
        );
      }

      const { FFFSType } = await import('@ffmpeg/ffmpeg');
      await engine.createDir(jobPath);
      createdJob = true;
      await engine.createDir(inputDirectory);
      createdInputDirectory = true;
      await engine.createDir(outputDirectory);
      createdOutputDirectory = true;
      await engine.mount(FFFSType.WORKERFS, { files: [file] }, inputDirectory);
      mounted = true;
      result = await operation(engine, inputPath, outputDirectory);
    } catch (error) {
      failure = error;
    }

    if (engine?.loaded && !signal.aborted) {
      const attemptCleanup = async (cleanup: () => Promise<unknown>) => {
        try {
          await cleanup();
        } catch (error) {
          cleanupFailure ??= error;
        }
      };

      if (mounted) {
        await attemptCleanup(() => engine.unmount(inputDirectory));
      }
      if (createdOutputDirectory) {
        let outputFiles: Awaited<ReturnType<typeof engine.listDir>> = [];
        await attemptCleanup(async () => {
          outputFiles = await engine.listDir(outputDirectory);
        });
        for (const outputFile of outputFiles) {
          if (!outputFile.isDir) {
            await attemptCleanup(() =>
              engine.deleteFile(`${outputDirectory}/${outputFile.name}`),
            );
          }
        }
        await attemptCleanup(() => engine.deleteDir(outputDirectory));
      }
      if (createdInputDirectory) {
        await attemptCleanup(() => engine.deleteDir(inputDirectory));
      }
      if (createdJob) {
        await attemptCleanup(() => engine.deleteDir(jobPath));
      }
    }

    if (signal.aborted && engine) {
      engine.terminate();
      if (this.engine === engine) {
        this.engine = null;
      }
    }
    if (failure && cleanupFailure) {
      throw new AggregateError(
        [failure, cleanupFailure],
        'Video processing failed and temporary media could not be fully released.',
      );
    }
    if (failure) {
      throw failure;
    }
    if (cleanupFailure) {
      throw new VideoUploadError(
        'compression_failed',
        'Temporary video processing data could not be released.',
      );
    }
    if (result === null) {
      throw new VideoUploadError(
        'compression_failed',
        'Video processing returned without producing a result.',
      );
    }
    return result;
  }

  async inspectMetadata(
    file: File,
    sourceFormat: VideoFormat,
    signal: AbortSignal,
  ): Promise<MediaMetadata> {
    return this.withExclusiveOperation(() =>
      this.withMountedInput(
        file,
        sourceFormat,
        signal,
        async (engine, inputPath, outputDirectory) => {
          const probePath = `${outputDirectory}/metadata.json`;
          const exitCode = await engine.ffprobe(
            [
              '-v',
              'error',
              '-show_entries',
              'stream=codec_type,codec_name,width,height,duration,avg_frame_rate,r_frame_rate,bit_rate:format=duration,bit_rate',
              '-of',
              'json',
              inputPath,
              '-o',
              probePath,
            ],
            -1,
            { signal },
          );
          if (exitCode !== 0) {
            throw new VideoUploadError(
              'corrupted_file',
              'FFmpeg could not inspect this video.',
            );
          }

          const probeFile = await engine.readFile(probePath, 'utf8');
          if (typeof probeFile !== 'string') {
            throw new VideoUploadError(
              'corrupted_file',
              'FFmpeg returned invalid video metadata.',
            );
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(probeFile);
          } catch {
            throw new VideoUploadError(
              'corrupted_file',
              'FFmpeg returned invalid video metadata.',
            );
          }
          if (typeof parsed !== 'object' || parsed === null) {
            throw new VideoUploadError(
              'corrupted_file',
              'FFmpeg returned invalid video metadata.',
            );
          }

          const record = parsed as ProbeRecord;
          const streams = Array.isArray(record.streams)
            ? record.streams.filter(isRecord)
            : [];
          const videoStream = streams.find(
            (stream) => (stream as ProbeStream).codec_type === 'video',
          ) as ProbeStream | undefined;
          const audioStream = streams.find(
            (stream) => (stream as ProbeStream).codec_type === 'audio',
          ) as ProbeStream | undefined;
          const format = isRecord(record.format) ? record.format : {};
          const width = parsePositiveNumber(videoStream?.width);
          const height = parsePositiveNumber(videoStream?.height);
          const durationSeconds =
            parsePositiveNumber(format.duration) ??
            parsePositiveNumber(videoStream?.duration);
          const videoCodec =
            typeof videoStream?.codec_name === 'string'
              ? videoStream.codec_name.toLowerCase()
              : '';
          const audioCodec =
            typeof audioStream?.codec_name === 'string'
              ? audioStream.codec_name.toLowerCase()
              : null;

          if (!width || !height || !durationSeconds || !videoCodec) {
            throw new VideoUploadError(
              'corrupted_file',
              'The video is missing required media metadata.',
            );
          }
          if (!supportedVideoCodecs.has(videoCodec)) {
            throw new VideoUploadError(
              'unsupported_codec',
              'This video codec is not supported.',
            );
          }

          const formatRecord = format as Record<string, unknown>;
          const frameRate =
            parseFrameRate(videoStream?.avg_frame_rate) ??
            parseFrameRate(videoStream?.r_frame_rate);
          const bitrateBps =
            parsePositiveNumber(formatRecord.bit_rate) ??
            parsePositiveNumber(videoStream?.bit_rate);

          return {
            durationMs: Math.round(durationSeconds * 1000),
            width,
            height,
            aspectRatio: width / height,
            frameRate,
            videoCodec,
            audioCodec,
            bitrateBps,
            fileSizeBytes: file.size,
            orientation:
              width === height
                ? 'square'
                : width > height
                  ? 'landscape'
                  : 'portrait',
          };
        },
      ),
    );
  }

  async generatePreview(
    file: File,
    sourceFormat: VideoFormat,
    durationSeconds: number,
    signal: AbortSignal,
    onProgress: (percentage: number) => void,
  ): Promise<File> {
    const previewDuration = Math.max(1, Math.min(8, durationSeconds));
    return this.withExclusiveOperation(() =>
      this.withMountedInput(
        file,
        sourceFormat,
        signal,
        async (engine, inputPath, outputDirectory) => {
          const outputPath = `${outputDirectory}/preview.mp4`;
          const progressListener = ({ progress }: { progress: number }) => {
            if (Number.isFinite(progress)) {
              onProgress(
                Math.max(0, Math.min(100, Math.round(progress * 100))),
              );
            }
          };
          engine.on('progress', progressListener);
          let exitCode: number;
          try {
            exitCode = await engine.exec(
              [
                '-i',
                inputPath,
                '-t',
                String(previewDuration),
                '-map',
                '0:v:0',
                '-an',
                '-vf',
                'scale=480:480:force_original_aspect_ratio=decrease',
                '-c:v',
                'libx264',
                '-preset',
                'ultrafast',
                '-crf',
                '30',
                '-pix_fmt',
                'yuv420p',
                '-movflags',
                '+faststart',
                outputPath,
              ],
              -1,
              { signal },
            );
          } finally {
            engine.off('progress', progressListener);
          }
          if (exitCode !== 0) {
            throw new VideoUploadError(
              'compression_failed',
              'FFmpeg could not create the preview clip.',
            );
          }

          const outputData = await engine.readFile(outputPath);
          if (typeof outputData === 'string' || outputData.length === 0) {
            throw new VideoUploadError(
              'compression_failed',
              'FFmpeg produced an empty preview clip.',
            );
          }
          onProgress(100);
          return new File(
            [toBlob(outputData, 'video/mp4')],
            'connectly-preview.mp4',
            { type: 'video/mp4', lastModified: Date.now() },
          );
        },
      ),
    );
  }

  async compress(
    file: File,
    sourceFormat: VideoFormat,
    sourceMetadata: VideoProbeMetadata | VideoMetadata,
    preset: CompressionPreset,
    signal: AbortSignal,
    onProgress: (percentage: number) => void,
  ): Promise<CompressionResult> {
    return this.withExclusiveOperation(() =>
      this.compressUnlocked(
        file,
        sourceFormat,
        sourceMetadata,
        preset,
        signal,
        onProgress,
      ),
    );
  }

  private async compressUnlocked(
    file: File,
    sourceFormat: VideoFormat,
    sourceMetadata: VideoProbeMetadata | VideoMetadata,
    preset: CompressionPreset,
    signal: AbortSignal,
    onProgress: (percentage: number) => void,
  ): Promise<CompressionResult> {
    let engine: Awaited<ReturnType<typeof this.getEngine>> | null = null;
    let createdJob = false;
    let createdInputDirectory = false;
    let createdOutputDirectory = false;
    let mounted = false;
    let probeWritten = false;
    let outputWritten = false;
    let failure: unknown;
    let cleanupFailure: unknown;
    let result: {
      file: File;
      metadata: VideoMetadata;
      dimensions: { width: number; height: number };
    } | null = null;
    const jobId = crypto.randomUUID();
    const jobPath = `/job-${jobId}`;
    const inputDirectory = `${jobPath}/input`;
    const outputDirectory = `${jobPath}/output`;
    const inputPath = `${inputDirectory}/source.${sourceFormat}`;
    const probePath = `${jobPath}/probe.json`;
    const outputPath = `${outputDirectory}/compressed.mp4`;
    let logText = '';

    try {
      engine = await this.getEngine(signal);
      if (signal.aborted) {
        throw new VideoUploadError('cancelled', 'Compression was cancelled.');
      }

      const logListener = ({ message }: { message: string }) => {
        logText = `${logText}\n${message}`.slice(-8000);
      };
      const progressListener = ({ progress }: { progress: number }) => {
        if (Number.isFinite(progress)) {
          onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
        }
      };
      engine.on('log', logListener);
      engine.on('progress', progressListener);

      try {
        const { FFFSType } = await import('@ffmpeg/ffmpeg');
        await engine.createDir(jobPath);
        createdJob = true;
        await engine.createDir(outputDirectory);
        createdOutputDirectory = true;
        await engine.createDir(inputDirectory);
        createdInputDirectory = true;
        await engine.mount(
          FFFSType.WORKERFS,
          { files: [file] },
          inputDirectory,
        );
        mounted = true;

        let metadata: VideoMetadata;
        if (isMediaMetadata(sourceMetadata)) {
          if (sourceMetadata.fileSizeBytes !== file.size) {
            throw new VideoUploadError(
              'corrupted_file',
              'The inspected metadata does not match the selected file.',
            );
          }
          metadata = sourceMetadata;
        } else {
          const probeExitCode = await engine.ffprobe(
            [
              '-v',
              'error',
              '-show_entries',
              'stream=codec_type,codec_name,width,height,duration,avg_frame_rate,r_frame_rate,bit_rate:format=duration,bit_rate',
              '-of',
              'json',
              inputPath,
              '-o',
              probePath,
            ],
            -1,
            { signal },
          );
          if (probeExitCode !== 0) {
            throw new VideoUploadError(
              'corrupted_file',
              'FFmpeg could not decode this video.',
            );
          }
          probeWritten = true;

          const probeFile = await engine.readFile(probePath, 'utf8');
          if (typeof probeFile !== 'string') {
            throw new VideoUploadError(
              'corrupted_file',
              'FFmpeg returned invalid video metadata.',
            );
          }
          let parsedProbe: unknown;
          try {
            parsedProbe = JSON.parse(probeFile);
          } catch {
            throw new VideoUploadError(
              'corrupted_file',
              'FFmpeg returned invalid video metadata.',
            );
          }
          metadata = parseProbeData(parsedProbe, sourceMetadata, file.size);
        }
        validateProbedMetadata(metadata);
        const presetOptions = compressionPresets[preset];
        const outputDimensions = calculateOutputDimensions(
          metadata.width,
          metadata.height,
          presetOptions.maxDimension,
        );
        const outputArgs = [
          '-i',
          inputPath,
          '-map',
          '0:v:0',
          '-map',
          '0:a?',
          '-vf',
          `scale=${outputDimensions.width}:${outputDimensions.height}`,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-threads',
          '1',
          '-crf',
          String(presetOptions.crf),
          '-maxrate',
          `${presetOptions.maxBitrateKbps}k`,
          '-bufsize',
          `${presetOptions.maxBitrateKbps * 2}k`,
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          outputPath,
        ];
        const exitCode = await engine.exec(outputArgs, -1, { signal });
        if (exitCode !== 0) {
          const message = /invalid data|could not find codec parameters/i.test(
            logText,
          )
            ? 'The video is damaged or uses an unsupported codec.'
            : 'FFmpeg could not compress this video.';
          throw new VideoUploadError('compression_failed', message);
        }
        outputWritten = true;

        const outputData = await engine.readFile(outputPath);
        if (typeof outputData === 'string' || outputData.length === 0) {
          throw new VideoUploadError(
            'compression_failed',
            'FFmpeg produced an empty compressed video.',
          );
        }

        onProgress(100);
        result = {
          file: new File(
            [toBlob(outputData, 'video/mp4')],
            'connectly-video.mp4',
            { type: 'video/mp4', lastModified: Date.now() },
          ),
          metadata,
          dimensions: outputDimensions,
        };
      } finally {
        engine.off('log', logListener);
        engine.off('progress', progressListener);
      }
    } catch (error) {
      failure = classifyCompressionFailure(error, signal, logText);
    }

    if (engine?.loaded && !signal.aborted) {
      const cleanupResults = await Promise.allSettled([
        ...(mounted ? [engine.unmount(inputDirectory)] : []),
        ...(probeWritten ? [engine.deleteFile(probePath)] : []),
        ...(outputWritten ? [engine.deleteFile(outputPath)] : []),
        ...(createdInputDirectory ? [engine.deleteDir(inputDirectory)] : []),
        ...(createdOutputDirectory ? [engine.deleteDir(outputDirectory)] : []),
        ...(createdJob ? [engine.deleteDir(jobPath)] : []),
      ]);
      const rejectedCleanup = cleanupResults.find(
        (cleanupResult) => cleanupResult.status === 'rejected',
      );
      if (rejectedCleanup?.status === 'rejected') {
        cleanupFailure = rejectedCleanup.reason;
      }
    }
    if (signal.aborted && engine) {
      engine.terminate();
      if (this.engine === engine) {
        this.engine = null;
      }
    }

    if (failure && cleanupFailure) {
      throw new AggregateError(
        [failure, cleanupFailure],
        'Compression failed and temporary media could not be fully released.',
      );
    }
    if (failure) {
      throw failure;
    }
    if (cleanupFailure) {
      throw new VideoUploadError(
        'compression_failed',
        'Temporary video processing data could not be released.',
      );
    }
    if (!result) {
      throw new VideoUploadError(
        'compression_failed',
        'FFmpeg returned without producing a compressed video.',
      );
    }
    return result;
  }
}

export const compressionService = new CompressionService();
