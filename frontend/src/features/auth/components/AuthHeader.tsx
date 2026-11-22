type AuthHeaderProps = {
  description: string;
  eyebrow?: string;
  title: string;
};

export function AuthHeader({
  description,
  eyebrow = 'WELCOME TO CONNECTLY',
  title,
}: AuthHeaderProps) {
  return (
    <header className="mb-7 space-y-2.5">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="text-sm leading-6 text-muted">{description}</p>
    </header>
  );
}
