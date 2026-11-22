import { PageHeader } from './shell';

type PagePlaceholderProps = {
  title: string;
  description?: string;
};

function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return <PageHeader title={title} description={description} />;
}

export default PagePlaceholder;
