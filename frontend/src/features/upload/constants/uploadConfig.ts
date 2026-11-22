export const uploadBuckets = {
  original: 'videos-original',
  compressed: 'videos-compressed',
  thumbnail: 'thumbnails',
} as const;

export const uploadLimits = {
  maxFileSizeBytes: 200 * 1024 * 1024,
  maxStoredVideoBytes: 500 * 1024 * 1024,
  maxThumbnailBytes: 5 * 1024 * 1024,
  maxDurationSeconds: 10 * 60,
  minResolution: 360,
  maxResolution: 7680,
  maxTitleLength: 100,
  maxCaptionLength: 2200,
  maxHashtags: 10,
  maxHashtagLength: 64,
} as const;

export const compressionPresets = {
  low: { crf: 30, maxDimension: 480, maxBitrateKbps: 1_000 },
  medium: { crf: 26, maxDimension: 720, maxBitrateKbps: 2_500 },
  high: { crf: 22, maxDimension: 1080, maxBitrateKbps: 5_000 },
} as const;

export type CompressionPreset = keyof typeof compressionPresets;

export const acceptedVideoFormats = {
  mp4: {
    mimeType: 'video/mp4',
    acceptedMimeTypes: ['video/mp4'],
    extension: 'mp4',
  },
  mov: {
    mimeType: 'video/quicktime',
    acceptedMimeTypes: ['video/quicktime'],
    extension: 'mov',
  },
  webm: {
    mimeType: 'video/webm',
    acceptedMimeTypes: ['video/webm'],
    extension: 'webm',
  },
  m4v: {
    mimeType: 'video/mp4',
    acceptedMimeTypes: ['video/mp4', 'video/x-m4v'],
    extension: 'm4v',
  },
} as const;

export type VideoFormat = keyof typeof acceptedVideoFormats;
