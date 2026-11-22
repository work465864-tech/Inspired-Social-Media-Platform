import { z } from 'zod';
import type {
  SignedAssetUploads,
  UploadDraft,
  UploadAssetDeclaration,
  UploadPaths,
  VideoVisibility,
} from '../types/upload';
import { normalizeUploadError, VideoUploadError } from './uploadErrorService';

const draftResponseSchema = z.object({
  videoId: z.string().uuid(),
  paths: z.object({
    original: z.string(),
    compressed: z.string(),
    thumbnail: z.string(),
  }),
});

const signedUploadsResponseSchema = z.object({
  compressed: z.object({ path: z.string(), signedUrl: z.string().url() }),
  thumbnail: z.object({ path: z.string(), signedUrl: z.string().url() }),
});

const completeResponseSchema = z.object({
  videoId: z.string().uuid(),
  status: z.literal('ready'),
});

type VideoDraftRequest = {
  title: string;
  description: string;
  sourceFormat: 'mp4' | 'mov' | 'webm' | 'm4v';
  visibility: VideoVisibility;
  allowComments: boolean;
};

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw normalizeUploadError(error);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new VideoUploadError(
      'server',
      'The upload service returned an unreadable response.',
    );
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : 'The upload request could not be completed.';
    throw new VideoUploadError(
      response.status === 401 || response.status === 403
        ? 'permission'
        : response.status >= 500
          ? 'server'
          : 'upload_failed',
      message,
    );
  }

  return body;
}

export const metadataService = {
  async createDraft(
    input: VideoDraftRequest,
    signal: AbortSignal,
  ): Promise<UploadDraft> {
    const body = await requestJson('/api/video-uploads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });
    const parsed = draftResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new VideoUploadError(
        'server',
        'The upload draft response was invalid.',
      );
    }
    return parsed.data as UploadDraft;
  },

  async createSignedUploads(
    videoId: string,
    paths: UploadPaths,
    signal: AbortSignal,
  ): Promise<SignedAssetUploads> {
    const body = await requestJson(
      `/api/video-uploads/${encodeURIComponent(videoId)}/sign`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(paths),
        signal,
      },
    );
    const parsed = signedUploadsResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new VideoUploadError(
        'server',
        'Secure upload links could not be read.',
      );
    }
    return parsed.data;
  },

  async complete(
    videoId: string,
    paths: UploadPaths,
    assets: UploadAssetDeclaration[],
    hashtags: string[],
    signal: AbortSignal,
  ): Promise<{ videoId: string; status: 'ready' }> {
    const body = await requestJson(
      `/api/video-uploads/${encodeURIComponent(videoId)}/complete`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths, assets, hashtags }),
        signal,
      },
    );
    const parsed = completeResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new VideoUploadError(
        'server',
        'The completed upload response was invalid.',
      );
    }
    return parsed.data;
  },

  async cancel(videoId: string, paths: UploadPaths): Promise<void> {
    await requestJson(`/api/video-uploads/${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(paths),
    });
  },
};
