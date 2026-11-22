export type VideoOrientation = 'landscape' | 'portrait' | 'square';

export type MediaMetadata = {
  durationMs: number;
  width: number;
  height: number;
  aspectRatio: number;
  frameRate: number | null;
  videoCodec: string;
  audioCodec: string | null;
  bitrateBps: number | null;
  fileSizeBytes: number;
  orientation: VideoOrientation;
};
