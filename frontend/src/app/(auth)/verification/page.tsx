import VerificationScreen from '../../../features/auth/components/screens/VerificationScreen';

type VerificationPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function VerificationPage({
  searchParams,
}: VerificationPageProps) {
  const params = await searchParams;
  const status = params.status === 'failed' ? 'failed' : null;

  return <VerificationScreen status={status} />;
}
