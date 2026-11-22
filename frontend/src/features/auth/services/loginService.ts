import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { loginSchema } from '../schemas/authSchemas';
import type { LoginFormValues } from '../types/auth';

export async function loginWithEmail({
  email,
  password,
}: LoginFormValues): Promise<void> {
  const credentials = loginSchema.parse({ email, password });
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    throw error;
  }

  if (!data.user || !data.session) {
    throw new Error('Supabase did not return an authenticated session.');
  }
}
