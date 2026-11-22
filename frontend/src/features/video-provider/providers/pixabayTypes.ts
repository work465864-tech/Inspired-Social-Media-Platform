import { z } from 'zod';

const pixabayVideoVariantSchema = z.object({
  url: z.string().optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  thumbnail: z.string().optional(),
});

export const pixabayVideoHitSchema = z.object({
  id: z.number().int().positive(),
  pageURL: z.string().optional(),
  tags: z.string().optional(),
  duration: z.number().finite().nonnegative().optional(),
  videos: z
    .object({
      large: pixabayVideoVariantSchema.optional(),
      medium: pixabayVideoVariantSchema.optional(),
      small: pixabayVideoVariantSchema.optional(),
      tiny: pixabayVideoVariantSchema.optional(),
    })
    .optional(),
  views: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  user_id: z.number().int().positive().optional(),
  user: z.string().optional(),
  userImageURL: z.string().optional(),
});

export const pixabayVideoPageSchema = z.object({
  total: z.number().int().nonnegative(),
  totalHits: z.number().int().nonnegative(),
  hits: z.array(pixabayVideoHitSchema),
});

export type PixabayVideoHit = z.infer<typeof pixabayVideoHitSchema>;
export type PixabayVideoVariant = z.infer<typeof pixabayVideoVariantSchema>;
export type PixabayVideoPage = z.infer<typeof pixabayVideoPageSchema>;

export type PixabayFetchOptions = RequestInit & {
  next?: { revalidate: number };
};

export type PixabayTransport = {
  fetch: (url: URL, options: PixabayFetchOptions) => Promise<Response>;
};
