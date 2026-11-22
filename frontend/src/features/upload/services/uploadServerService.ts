import 'server-only';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import type { Database, Tables } from '../../../types/database.types';
import {
  uploadBuckets,
  uploadLimits,
  type VideoFormat,
} from '../constants/uploadConfig';
import type { UploadAssetDeclaration, UploadPaths } from '../types/upload';

type TableWithWrites<
  Definition extends { Insert: unknown; Update: unknown },
  Insert,
  Update,
> = Omit<Definition, 'Insert' | 'Update'> & {
  Insert: Insert;
  Update: Update;
};

type PublicTables = Database['public']['Tables'];
type ServiceRoleDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Omit<
      PublicTables,
      'videos' | 'video_assets' | 'hashtags' | 'video_hashtags'
    > & {
      videos: TableWithWrites<
        PublicTables['videos'],
        Partial<Tables<'videos'>> & Pick<Tables<'videos'>, 'user_id'>,
        Partial<Tables<'videos'>>
      >;
      video_assets: TableWithWrites<
        PublicTables['video_assets'],
        Partial<Tables<'video_assets'>> &
          Pick<
            Tables<'video_assets'>,
            | 'video_id'
            | 'asset_type'
            | 'bucket_id'
            | 'object_path'
            | 'mime_type'
            | 'byte_size'
          >,
        Partial<Tables<'video_assets'>>
      >;
      hashtags: TableWithWrites<
        PublicTables['hashtags'],
        Pick<Tables<'hashtags'>, 'slug'>,
        Partial<Tables<'hashtags'>>
      >;
      video_hashtags: TableWithWrites<
        PublicTables['video_hashtags'],
        Pick<Tables<'video_hashtags'>, 'video_id' | 'hashtag_id'>,
        Partial<Tables<'video_hashtags'>>
      >;
    };
  };
};

export type UploadServiceRoleClient = SupabaseClient<ServiceRoleDatabase>;

export class UploadApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'UploadApiError';
  }
}

export function uploadApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof UploadApiError) {
    return NextResponse.json(
      { code: error.code, error: error.message },
      { status: error.status },
    );
  }

  console.error(
    'Unexpected upload API failure:',
    error instanceof Error ? error.name : 'Unknown error',
  );
  return NextResponse.json(
    {
      code: 'upload_failed',
      error: 'The upload request could not be completed.',
    },
    { status: 500 },
  );
}

export async function requireUploadPermission() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new UploadApiError(
      401,
      'unauthorized',
      'Your session could not be verified.',
    );
  }
  if (!user) {
    throw new UploadApiError(
      401,
      'unauthorized',
      'Sign in before uploading a video.',
    );
  }

  const { data: permitted, error: permissionError } = await supabase.rpc(
    'has_permission',
    { requested_permission: 'videos:upload' },
  );
  if (permissionError) {
    throw new UploadApiError(
      503,
      'permission_check_failed',
      'Upload permissions could not be checked.',
    );
  }
  if (!permitted) {
    throw new UploadApiError(
      403,
      'forbidden',
      'Your account is not permitted to upload videos.',
    );
  }

  return { supabase, user };
}

export function createUploadAdminClient(): UploadServiceRoleClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new UploadApiError(
      503,
      'upload_not_configured',
      'Video uploads are not configured on the server.',
    );
  }

  return createClient<ServiceRoleDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createUploadPaths(
  userId: string,
  videoId: string,
  sourceFormat: VideoFormat,
): UploadPaths {
  const directory = `${userId}/${videoId}`;
  return {
    original: `${directory}/${crypto.randomUUID()}-original.${sourceFormat}`,
    compressed: `${directory}/${crypto.randomUUID()}-compressed.mp4`,
    thumbnail: `${directory}/${crypto.randomUUID()}-thumbnail.jpg`,
  };
}

export function isUploadPathForVideo(
  path: string,
  userId: string,
  videoId: string,
  kind: keyof UploadPaths,
): boolean {
  const directory = `${userId}/${videoId}/`;
  if (
    !path.startsWith(directory) ||
    path.slice(directory.length).includes('/')
  ) {
    return false;
  }

  const filename = path.slice(directory.length);
  const uuid =
    '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  const suffix =
    kind === 'original'
      ? 'original\\.(mp4|mov|webm|m4v)'
      : kind === 'compressed'
        ? 'compressed\\.mp4'
        : 'thumbnail\\.jpg';

  return new RegExp(`^${uuid}-${suffix}$`, 'i').test(filename);
}

export function validateUploadPaths(
  paths: UploadPaths,
  userId: string,
  videoId: string,
): void {
  for (const kind of Object.keys(uploadBuckets) as Array<keyof UploadPaths>) {
    if (!isUploadPathForVideo(paths[kind], userId, videoId, kind)) {
      throw new UploadApiError(
        400,
        'invalid_path',
        'The upload object path is invalid.',
      );
    }
  }
}

export async function requireOwnedDraft(
  videoId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const { data: video, error } = await supabase
    .from('videos')
    .select('id,status,user_id')
    .eq('id', videoId)
    .eq('user_id', userId)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new UploadApiError(
      503,
      'video_lookup_failed',
      'The draft upload could not be verified.',
    );
  }
  if (!video) {
    throw new UploadApiError(
      404,
      'draft_not_found',
      'The upload draft is no longer available.',
    );
  }

  return video;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function verifyStoredAsset(
  admin: UploadServiceRoleClient,
  videoId: string,
  userId: string,
  asset: UploadAssetDeclaration,
): Promise<void> {
  const kind =
    asset.bucketId === uploadBuckets.original
      ? 'original'
      : asset.bucketId === uploadBuckets.compressed
        ? 'compressed'
        : 'thumbnail';
  if (
    !isUploadPathForVideo(asset.objectPath, userId, videoId, kind) ||
    asset.byteSize <= 0 ||
    asset.byteSize >
      (kind === 'thumbnail'
        ? uploadLimits.maxThumbnailBytes
        : uploadLimits.maxStoredVideoBytes)
  ) {
    throw new UploadApiError(
      400,
      'invalid_asset',
      'The uploaded file metadata is invalid.',
    );
  }

  const directory = `${userId}/${videoId}`;
  const filename = asset.objectPath.slice(directory.length + 1);
  const { data, error } = await admin.storage
    .from(asset.bucketId)
    .list(directory, { limit: 10, search: filename });

  if (error) {
    throw new UploadApiError(
      502,
      'storage_verification_failed',
      'Uploaded files could not be verified in Storage.',
    );
  }

  const storedObject = data.find((file) => file.name === filename);
  const metadata: unknown = storedObject?.metadata;
  const storedSize = isRecord(metadata) ? Number(metadata.size) : NaN;
  const storedMimeType = isRecord(metadata) ? metadata.mimetype : null;
  if (
    !storedObject ||
    storedSize !== asset.byteSize ||
    storedMimeType !== asset.mimeType
  ) {
    throw new UploadApiError(
      400,
      'asset_missing_or_mismatched',
      'One or more uploaded files are missing, incomplete, or have mismatched metadata.',
    );
  }
}

export async function cancelOwnedDraft(
  admin: UploadServiceRoleClient,
  videoId: string,
  userId: string,
  paths: UploadPaths,
): Promise<void> {
  validateUploadPaths(paths, userId, videoId);

  const { error: assetError } = await admin
    .from('video_assets')
    .delete()
    .eq('video_id', videoId);
  if (assetError) {
    throw new UploadApiError(
      502,
      'asset_cleanup_failed',
      'The upload metadata could not be cleaned up.',
    );
  }

  const removalResults = await Promise.all([
    admin.storage.from(uploadBuckets.original).remove([paths.original]),
    admin.storage.from(uploadBuckets.compressed).remove([paths.compressed]),
    admin.storage.from(uploadBuckets.thumbnail).remove([paths.thumbnail]),
  ]);
  const removalError = removalResults.find((result) => result.error)?.error;
  if (removalError) {
    throw new UploadApiError(
      502,
      'storage_cleanup_failed',
      'Uploaded files could not be fully removed.',
    );
  }

  const { data: deletedVideo, error: videoError } = await admin
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('user_id', userId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (videoError || !deletedVideo) {
    throw new UploadApiError(
      502,
      'draft_cleanup_failed',
      'The upload draft could not be removed.',
    );
  }
}
