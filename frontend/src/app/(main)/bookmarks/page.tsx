import { PageContainer } from '../../../components/shell/PageContainer';
import { PageHeader } from '../../../components/shell/PageHeader';
import { BookmarkGallery } from '../../../features/share-bookmark/components/BookmarkGallery';

export default function BookmarksPage() {
  return (
    <PageContainer>
      <PageHeader
        description="A personal collection of videos you want to revisit."
        title="Saved videos"
      />
      <BookmarkGallery />
    </PageContainer>
  );
}
