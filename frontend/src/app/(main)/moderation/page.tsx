import { ModeratorGuard } from '../../../features/rbac/components/ModeratorGuard';

export default function ModerationPage() {
  return (
    <ModeratorGuard>
      <section className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Trust & safety
        </p>
        <h1 className="text-display font-semibold text-foreground">
          Moderation dashboard
        </h1>
        <p className="text-sm leading-6 text-muted">
          Review tools will be available here as moderation features are
          introduced.
        </p>
      </section>
    </ModeratorGuard>
  );
}
