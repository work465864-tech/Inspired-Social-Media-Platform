type AuthOperation =
  | 'login'
  | 'oauth'
  | 'profile'
  | 'recovery'
  | 'reset'
  | 'signup'
  | 'verification';

function getErrorText(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return null;
}

function getErrorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code.toLowerCase();
  }
  return '';
}

export function getAuthErrorMessage(
  error: unknown,
  operation: AuthOperation,
): string {
  const errorText = getErrorText(error);
  if (!errorText) {
    return 'An unexpected authentication error occurred. Please try again.';
  }

  const message = errorText.toLowerCase();
  const code = getErrorCode(error);

  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }

  if (message.includes('account suspended') || code === 'account_suspended') {
    return 'This account is temporarily unavailable. Contact support if you need help.';
  }
  if (message.includes('account banned') || code === 'account_banned') {
    return 'This account is unavailable. Contact support if you believe this is a mistake.';
  }

  if (
    message.includes('username is already taken') ||
    message.includes('profiles_username_lower_idx')
  ) {
    return 'That username is already taken.';
  }

  if (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already registered') ||
    message.includes('email_exists')
  ) {
    return 'An account with this email already exists.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  if (
    message.includes('weak password') ||
    message.includes('password should be at least')
  ) {
    return 'Choose a stronger password with uppercase, lowercase, a number, and a symbol.';
  }

  if (
    message.includes('invalid email') ||
    message.includes('email address is invalid')
  ) {
    return 'Enter a valid email address.';
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('fetch error')
  ) {
    return 'Network error. Check your connection and try again.';
  }

  if (
    message.includes('otp_expired') ||
    message.includes('expired') ||
    message.includes('invalid token') ||
    message.includes('token has expired')
  ) {
    return 'This link has expired or was already used. Request a new email and try again.';
  }

  if (
    message.includes('rate limit') ||
    message.includes('over_email_send_rate_limit')
  ) {
    return 'Too many emails were requested. Please wait a few minutes and try again.';
  }

  if (
    message.includes('provider is not enabled') ||
    message.includes('unsupported provider') ||
    message.includes('provider not enabled')
  ) {
    return 'This sign-in provider is not configured yet.';
  }

  if (
    message.includes('duplicate key') ||
    message.includes('profiles_username_lower_idx') ||
    message.includes('database error saving new user')
  ) {
    return 'We could not create your profile. Please try again or contact support.';
  }

  if (
    message.includes("could not find the table 'public.profiles'") ||
    message.includes('relation "profiles" does not exist')
  ) {
    return 'The profile database is not set up yet. Run the Supabase profiles migration first.';
  }

  const fallbackMessages: Record<AuthOperation, string> = {
    login: 'Unable to sign in. Please try again.',
    oauth: 'Unable to sign in with this provider. Please try again.',
    profile: 'We could not create your profile. Please try again.',
    recovery: 'Unable to send a password reset email. Please try again.',
    reset: 'Unable to update your password. Please try again.',
    signup: 'Unable to create your account. Please try again.',
    verification: 'Unable to send a verification email. Please try again.',
  };

  if (
    operation === 'profile' ||
    operation === 'recovery' ||
    operation === 'reset' ||
    operation === 'verification'
  ) {
    return fallbackMessages[operation];
  }

  return fallbackMessages[operation];
}
