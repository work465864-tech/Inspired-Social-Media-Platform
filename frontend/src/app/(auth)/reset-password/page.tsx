import ResetPasswordScreen from '../../../features/auth/components/screens/ResetPasswordScreen';

type ResetPasswordPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const invalidLink = params.status === 'invalid-link';

  return <ResetPasswordScreen invalidLink={invalidLink} />;
}
