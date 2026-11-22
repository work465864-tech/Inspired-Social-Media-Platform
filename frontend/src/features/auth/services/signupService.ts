import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { signupSchema } from '../schemas/authSchemas';
import type { SignupFormValues } from '../types/auth';

type SignupResult = {
  emailConfirmationRequired: boolean;
  sessionCreated: boolean;
};

export async function signupWithEmail({
  email,
  fullName,
  password,
  username,
}: SignupFormValues): Promise<SignupResult> {
  const values = signupSchema.parse({ email, fullName, password, username });
  const supabase = createSupabaseBrowserClient();
  const normalizedUsername = values.username;
  const { data: existingProfile, error: usernameError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (usernameError) {
    throw usernameError;
  }

  if (existingProfile) {
    throw new Error('Username is already taken.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        full_name: values.fullName,
        username: normalizedUsername,
      },
      emailRedirectTo: new URL(
        '/auth/callback?next=%2Fverification',
        window.location.origin,
      ).href,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Supabase did not return a user for this signup.');
  }

  if (data.user.identities?.length === 0) {
    throw new Error('An account with this email already exists.');
  }

  return {
    emailConfirmationRequired: !data.session,
    sessionCreated: Boolean(data.session),
  };
}

export async function resendSignupVerification(email: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: new URL(
        '/auth/callback?next=%2Fverification',
        window.location.origin,
      ).href,
    },
  });

  if (error) {
    throw error;
  }
}
