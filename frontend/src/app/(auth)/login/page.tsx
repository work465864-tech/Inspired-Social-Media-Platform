import LoginScreen from '../../../features/auth/components/screens/LoginScreen';

type LoginPageProps = {
  searchParams: Promise<{ oauth?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const oauthStatus =
    params.oauth === 'cancelled' ||
    params.oauth === 'failed' ||
    params.oauth === 'network' ||
    params.oauth === 'unavailable' ||
    params.oauth === 'profile-failed'
      ? params.oauth
      : null;

  return <LoginScreen oauthStatus={oauthStatus} />;
}
