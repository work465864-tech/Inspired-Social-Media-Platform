import { FeedSidebar } from '../../features/feed/components/FeedSidebar';

export function RightSidebar() {
  return (
    <aside
      aria-label="Discover more"
      className="sticky top-24 hidden h-fit space-y-5 pt-8 xl:block"
    >
      <FeedSidebar />
    </aside>
  );
}
