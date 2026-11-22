type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-8 space-y-2 sm:mb-10">
      <h1 className="text-display font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
          {description}
        </p>
      )}
    </header>
  );
}
