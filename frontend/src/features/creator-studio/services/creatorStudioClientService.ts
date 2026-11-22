'use client';

import { z } from 'zod';
import type { CreatorAnalyticsRange } from '../../creator-analytics/types';
import {
  creatorVideoEditorSchema,
  creatorVideoStatusSchema,
  creatorStudioSnapshotSchema,
  type CreatorContentFilters,
  type CreatorVideoEditorInput,
  type CreatorVideoPage,
} from '../types';

const creatorVideoPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      caption: z.string(),
      visibility: z.enum(['public', 'followers', 'private']),
      hashtags: z.array(z.string()),
      status: z.enum(['ready', 'draft', 'processing', 'failed', 'hidden']),
      views: z.number().nonnegative(),
      likes: z.number().nonnegative(),
      comments: z.number().nonnegative(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().nonnegative(),
  totalPages: z.number().nonnegative(),
});

async function requestJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : 'The creator request could not be completed.';
    throw new Error(message);
  }
  return payload;
}

export class CreatorStudioClientService {
  async getSnapshot(range: CreatorAnalyticsRange) {
    const payload = await requestJson(
      `/api/creator-studio/dashboard?range=${range}`,
    );
    return creatorStudioSnapshotSchema.parse(payload);
  }

  async getVideos(filters: CreatorContentFilters): Promise<CreatorVideoPage> {
    const params = new URLSearchParams({
      page: String(filters.page),
      q: filters.query,
      sort: filters.sort,
      status: creatorVideoStatusSchema.parse(filters.status),
    });
    const payload = await requestJson(
      `/api/creator-studio/videos?${params.toString()}`,
    );
    return creatorVideoPageSchema.parse(payload);
  }

  async updateVideo(
    videoId: string,
    input: CreatorVideoEditorInput,
  ): Promise<void> {
    const metadata = creatorVideoEditorSchema.parse(input);
    await requestJson(`/api/creator-studio/videos/${videoId}`, {
      method: 'PATCH',
      body: JSON.stringify(metadata),
    });
  }

  async deleteVideo(videoId: string): Promise<void> {
    await requestJson(`/api/creator-studio/videos/${videoId}`, {
      method: 'DELETE',
    });
  }
}

export const creatorStudioClientService = new CreatorStudioClientService();
