import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { emailSchema, passwordSchema } from '../schemas/authSchemas';

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = emailSchema.parse(email);
  const supabase = createSupabaseBrowserClient();
  const redirectTo = new URL('/reset-password', window.location.origin).href;
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function verifyPasswordRecoveryCode(
  email: string,
  token: string,
): Promise<void> {
  const normalizedEmail = emailSchema.parse(email);
  const recoveryToken = token.trim();
  if (!/^\d{6,10}$/.test(recoveryToken)) {
    throw new Error('Enter the recovery code from your email.');
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: recoveryToken,
    type: 'recovery',
  });
  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string): Promise<void> {
  const validatedPassword = passwordSchema.parse(password);
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }
  if (!user) {
    throw new Error('A valid password recovery session is required.');
  }

  const { error } = await supabase.auth.updateUser({
    password: validatedPassword,
  });
  if (error) {
    throw error;
  }
}
