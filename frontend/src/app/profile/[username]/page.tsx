import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppLayout from '../../../layouts/AppLayout';
import { PublicCreatorProfile } from '../../../features/public-profile/components/PublicCreatorProfile';
import { publicProfileService } from '../../../features/public-profile/services/publicProfileService';
import { profileUsernameSchema } from '../../../features/auth/schemas/profileSchemas';

export const dynamic = 'force-dynamic';

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string; tab?: string }>;
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
  searchParams,
}: PublicProfilePageProps) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const parsedUsername = profileUsernameSchema.safeParse(username);
  if (!parsedUsername.success) {
    notFound();
  }

  const requestedPage = Number.parseInt(query.page ?? '1', 10);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 10_000)
      : 1;
  const tab =
    query.tab === 'reposts' || query.tab === 'likes' ? query.tab : 'videos';
  let profile;
  try {
    profile = await publicProfileService.getByUsername(
      parsedUsername.data,
      page,
      tab,
    );
  } catch (error) {
    console.error('Public profile could not be loaded.', error);
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error prevented this profile from loading.';

    return (
      <AppLayout>
        <section
          aria-labelledby="profile-error-heading"
          className="mx-auto grid min-h-64 max-w-xl content-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center"
          role="alert"
        >
          <h1
            className="text-xl font-semibold text-foreground"
            id="profile-error-heading"
          >
            This profile is temporarily unavailable
          </h1>
          <p className="text-sm leading-6 text-muted">{message}</p>
          <Link
            className="mx-auto mt-2 inline-flex min-h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-surface-raised"
            href={`/profile/${encodeURIComponent(parsedUsername.data)}`}
          >
            Try again
          </Link>
        </section>
      </AppLayout>
    );
  }
  if (!profile) {
    notFound();
  }
  const activeTab = tab === 'likes' && !profile.isOwner ? 'videos' : tab;

  return (
    <AppLayout>
      <PublicCreatorProfile activeTab={activeTab} profile={profile} />
    </AppLayout>
  );
}
