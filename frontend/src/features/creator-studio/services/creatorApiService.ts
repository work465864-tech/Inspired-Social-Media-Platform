import 'server-only';

import { createSupabaseServerClient } from '../../../lib/supabase/server';

export class CreatorApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CreatorApiError';
  }
}

export async function requireCreatorUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new CreatorApiError(401, 'unauthorized', 'Sign in to continue.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) {
    throw new CreatorApiError(
      503,
      'creator_access_unavailable',
      'Creator access could not be verified.',
    );
  }
  if (!profile || profile.status !== 'active') {
    throw new CreatorApiError(
      403,
      'creator_access_restricted',
      'Creator tools are unavailable for this account.',
    );
  }

  return { supabase, user: data.user };
}

export function creatorApiErrorResponse(error: unknown): Response {
  if (error instanceof CreatorApiError) {
    return Response.json(
      { code: error.code, error: error.message },
      { status: error.status },
    );
  }

  console.error(
    'Unexpected creator API failure:',
    error instanceof Error ? error.name : 'Unknown error',
  );
  return Response.json(
    {
      code: 'creator_request_failed',
      error: 'The creator request could not be completed.',
    },
    { status: 500 },
  );
}
