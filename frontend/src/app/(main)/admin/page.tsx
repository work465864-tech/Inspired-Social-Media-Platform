import { AdminGuard } from '../../../features/rbac/components/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <section className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Administration
        </p>
        <h1 className="text-display font-semibold text-foreground">
          Admin dashboard
        </h1>
        <p className="text-sm leading-6 text-muted">
          Administrative tools will be available here as platform features are
          introduced.
        </p>
      </section>
    </AdminGuard>
  );
}
