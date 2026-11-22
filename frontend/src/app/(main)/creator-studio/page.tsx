import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { CreatorDashboard } from '../../../features/creator-studio/components/CreatorDashboard';
import { CreatorStudioSkeleton } from '../../../features/creator-studio/components/CreatorStudioSkeleton';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CreatorStudioPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect('/login?next=%2Fcreator-studio');
  }

  return (
    <Suspense fallback={<CreatorStudioSkeleton />}>
      <CreatorDashboard />
    </Suspense>
  );
}
