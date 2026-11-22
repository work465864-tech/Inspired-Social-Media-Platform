import type { MediaProviderId } from './types';

export const defaultMediaProviderId: MediaProviderId = 'supabase';
export const defaultSignedUrlExpiresInSeconds = 60 * 60;
export const mediaRequestTimeoutMs = 15_000;

export const mediaProviderIds: readonly MediaProviderId[] = [
  'supabase',
  'peertube',
  'cloudflare-r2',
  'amazon-s3',
  'bunny',
  'local',
];
