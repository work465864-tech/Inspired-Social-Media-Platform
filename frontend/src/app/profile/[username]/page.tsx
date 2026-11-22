import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppLayout from '../../../layouts/AppLayout';
import { PublicCreatorProfile } from '../../../features/public-profile/components/PublicCreatorProfile';
import { publicProfileService } from '../../../features/public-profile/services/publicProfileService';
import { profileUsernameSchema } from '../../../features/auth/schemas/profileSchemas';

export const dynamic = 'force-dynamic';

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} on Connectly`,
    description: `View @${username}'s Connectly creator profile.`,
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const parsedUsername = profileUsernameSchema.safeParse(username);
  if (!parsedUsername.success) {
    notFound();
  }

  const profile = await publicProfileService.getByUsername(parsedUsername.data);
  if (!profile) {
    notFound();
  }

  return (
    <AppLayout>
      <PublicCreatorProfile profile={profile} />
    </AppLayout>
  );
}
