import { redirect } from 'next/navigation';
import { paths } from '../../../constants/paths.js';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?next=%2Fprofile');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    throw new Error('Your public profile could not be opened.');
  }
  if (!profile) {
    redirect(paths.profileSettings);
  }

  redirect(paths.creatorProfile(profile.username));
}
