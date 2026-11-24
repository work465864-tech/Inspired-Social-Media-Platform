import { z } from 'zod';

export const videoProviderIds = [
  'pixabay',
  'supabase',
  'user-uploads',
  'cloudflare-stream',
  'mux',
] as const;

export type VideoProviderId = (typeof videoProviderIds)[number];
export type VideoRequestKind = 'feed' | 'trending' | 'search';

export type Video = {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  playbackUrl: string;
  duration: number;
  width: number;
  height: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  creator: {
    id: string | null;
    username?: string | null;
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string | null;
  isDemoContent: boolean;
  attribution: {
    label: string;
    url: string;
  };
};

export type VideoPage = {
  items: Video[];
  nextPage: number | null;
  totalHits: number;
  metadata?: VideoPageMetadata;
};

export type VideoPageMetadata = {
  status: 'complete' | 'partial' | 'unavailable';
  unavailableSources: string[];
};

export type VideoPageRequest = {
  kind: VideoRequestKind;
  page: number;
  pageSize: number;
  query?: string;
};

const secureUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === 'https:');

export const videoSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(160),
  description: z.string().max(500),
  thumbnail: secureUrlSchema.nullable(),
  playbackUrl: secureUrlSchema,
  duration: z.number().finite().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  views: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  creator: z.object({
    id: z.string().nullable(),
    username: z.string().min(3).max(24).nullable().optional(),
    name: z.string().min(1).max(120),
    avatarUrl: secureUrlSchema.nullable(),
  }),
  createdAt: z.string().datetime().nullable(),
  isDemoContent: z.boolean(),
  attribution: z.object({
    label: z.string().min(1).max(80),
    url: secureUrlSchema,
  }),
});

export const videoPageSchema = z.object({
  items: z.array(videoSchema),
  nextPage: z.number().int().positive().nullable(),
  totalHits: z.number().int().nonnegative(),
  metadata: z
    .object({
      status: z.enum(['complete', 'partial', 'unavailable']),
      unavailableSources: z.array(z.string().min(1).max(80)).max(8),
    })
    .optional(),
});
