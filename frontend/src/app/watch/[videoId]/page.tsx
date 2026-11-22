import { SharedVideoPage } from '../../../features/share-bookmark/components/SharedVideoPage';

type SharedVideoRouteProps = {
  params: Promise<{ videoId: string }>;
};

export default async function SharedVideoRoute({
  params,
}: SharedVideoRouteProps) {
  const { videoId } = await params;
  return <SharedVideoPage videoId={videoId} />;
}
