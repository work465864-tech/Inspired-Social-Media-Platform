import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

function getSafeNextPath(value: string | null): string {
  if (
    value?.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
  ) {
    return value;
  }
  return '/';
}

function getCallbackFailurePath(isPasswordRecovery: boolean): string {
  return isPasswordRecovery
    ? '/reset-password?status=invalid-link'
    : '/verification?status=failed';
}

function getOAuthFailurePath(requestUrl: URL, callbackError = ''): string {
  const errorCode = requestUrl.searchParams.get('error_code')?.toLowerCase();
  const error = requestUrl.searchParams.get('error')?.toLowerCase();
  const description = requestUrl.searchParams
    .get('error_description')
    ?.toLowerCase();
  const errorMessage = callbackError.toLowerCase();
  const providerError = `${error ?? ''} ${description ?? ''} ${errorMessage}`;
  const wasCancelled =
    errorCode === 'access_denied' ||
    error === 'access_denied' ||
    description?.includes('cancel') ||
    description?.includes('denied');

  if (wasCancelled) {
    return '/login?oauth=cancelled';
  }
  if (
    providerError.includes('provider is not enabled') ||
    providerError.includes('unsupported provider') ||
    providerError.includes('provider not enabled')
  ) {
    return '/login?oauth=unavailable';
  }
  if (
    errorMessage.includes('database error saving new user') ||
    description?.includes('database error saving new user') ||
    errorMessage.includes('duplicate key')
  ) {
    return '/login?oauth=profile-failed';
  }
  if (
    providerError.includes('network') ||
    providerError.includes('failed to fetch') ||
    providerError.includes('timeout')
  ) {
    return '/login?oauth=network';
  }

  return '/login?oauth=failed';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const tokenType = requestUrl.searchParams.get('type');
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'));
  const isOAuthFlow = requestUrl.searchParams.get('flow') === 'oauth';
  const isPasswordRecovery = nextPath === '/reset-password';

  if (
    (!code && !(isPasswordRecovery && tokenHash && tokenType === 'recovery')) ||
    requestUrl.searchParams.has('error') ||
    requestUrl.searchParams.has('error_code') ||
    requestUrl.searchParams.has('error_description')
  ) {
    const failurePath = isOAuthFlow
      ? getOAuthFailurePath(requestUrl)
      : getCallbackFailurePath(isPasswordRecovery);
    return NextResponse.redirect(new URL(failurePath, requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  let error: Error | null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (isPasswordRecovery && tokenHash && tokenType === 'recovery') {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    }));
  } else {
    return NextResponse.redirect(
      new URL(getCallbackFailurePath(isPasswordRecovery), requestUrl.origin),
    );
  }

  if (error) {
    console.error('Supabase authentication callback failed:', error.message);
    const failurePath = isOAuthFlow
      ? getOAuthFailurePath(requestUrl, error.message)
      : getCallbackFailurePath(isPasswordRecovery);
    return NextResponse.redirect(new URL(failurePath, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
