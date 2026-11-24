# Supabase setup

For a complete database rebuild, follow [the database rebuild guide](database/rebuild-guide.md).
The historical migration list previously in this file was incomplete. Apply all
timestamped migrations in order; do not flatten or reorder them.

`config.toml` loads repeatable reference data from `seeds/*.sql` after migrations
when using `supabase start` or `supabase db reset`. A remote `db push` and the
SQL Editor do not automatically run seeds.

In **Authentication → URL Configuration**, set the local Site URL to
`http://localhost:3000` and allow `http://localhost:3000/reset-password` and
`http://localhost:3000/auth/callback` (and the exact production URLs). Password
reset requests redirect to `/reset-password`; auth callbacks remain in use for
signup verification and OAuth. Add the production origin and its `/auth/callback`
URL before deployment.

In **Authentication → Providers**, enable Google and GitHub and configure
their client credentials. Register the Supabase project's
`https://<project-ref>.supabase.co/auth/v1/callback` URL with each provider.
Keep provider secrets in Supabase, never in frontend environment variables.

In **Authentication → Providers → Email**, keep email signup enabled and turn
on email confirmations to require verification. Configure SMTP for production.
To avoid email scanners consuming one-time links, configure the **Reset Password**
template to show `{{ .Token }}` as a numeric recovery code and include a button
linking to `{{ .RedirectTo }}`. Do not use `{{ .ConfirmationURL }}` as the only
way to reset; it is a single-use link and scanners may open it before the user.

Keep the Supabase URL and public anon/publishable key in `frontend/.env.local`;
never put a service-role key in frontend variables.

The browser client persists sessions and refreshes access tokens. The Next.js
`src/proxy.ts` validates users for protected routes using the server-side Supabase
client.

See `../docs/security-architecture.md` for rate-limit, session validation,
permission enforcement, audit/activity adapter, CSRF, and production
configuration guidance. See `../docs/database-architecture.md` for the
relational model, RLS boundaries, storage policies, index strategy, migration
order, and type-generation workflow.

The RBAC migration backfills known `user`, `moderator`, and `admin` roles from
existing server-managed `auth.users.app_metadata.role` values. On a new project
without an existing admin, bootstrap the first admin only through a trusted
Supabase SQL Editor session; never expose service-role credentials to the app.
Client-side guards control presentation, while `public.has_permission()` is the
database authorization check to use in protected table and storage policies.
