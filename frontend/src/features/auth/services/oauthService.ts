import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

export type OAuthProvider =
  'apple' | 'discord' | 'facebook' | 'github' | 'google' | 'twitter';

export async function getOAuthAuthorizationUrl(
  provider: OAuthProvider,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('flow', 'oauth');
  callbackUrl.searchParams.set('next', '/feed');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.href,
      skipBrowserRedirect: true,
      ...(provider === 'github' ? { scopes: 'read:user user:email' } : {}),
    },
  });

  if (error) {
    throw error;
  }
  if (!data.url) {
    throw new Error('Supabase did not return an OAuth authorization URL.');
  }

  return data.url;
}
