import { z } from 'zod';
import {
  creatorAnalyticsSnapshotSchema,
  type CreatorAnalyticsRange,
} from '../creator-analytics/types';

export { creatorAnalyticsSnapshotSchema };
export type { CreatorAnalyticsRange };

export const creatorVideoStatusSchema = z.enum([
  'all',
  'ready',
  'draft',
  'drafts',
  'processing',
  'failed',
  'hidden',
]);

export const creatorVideoEditorSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    caption: z.string().trim().max(2200),
    visibility: z.enum(['public', 'followers', 'private']),
    hashtags: z.array(z.string().trim().min(1).max(64)).max(30),
  })
  .strict();

export const creatorStudioSnapshotSchema =
  creatorAnalyticsSnapshotSchema.extend({
    engagementRate: z.number().finite().nonnegative(),
  });

export type CreatorVideoStatus = z.infer<typeof creatorVideoStatusSchema>;
export type CreatorVideoEditorInput = z.infer<typeof creatorVideoEditorSchema>;
export type CreatorVideo = CreatorVideoEditorInput & {
  id: string;
  status: Exclude<CreatorVideoStatus, 'all'>;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatorVideoPage = {
  items: CreatorVideo[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreatorStudioSummary = z.infer<typeof creatorStudioSnapshotSchema>;

export type CreatorContentFilters = {
  page: number;
  pageSize: number;
  query: string;
  status: CreatorVideoStatus;
  sort: 'newest' | 'oldest' | 'most-viewed' | 'most-liked';
};
