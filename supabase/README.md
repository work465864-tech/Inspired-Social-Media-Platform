# Supabase authentication setup

1. In the Supabase SQL Editor, run `migrations/20261116160000_auth_profiles.sql`.
   It creates the `profiles` table, case-insensitive unique usernames, RLS policies,
   an auth-user profile trigger, and backfills existing users.
2. Then run `migrations/20261116170000_oauth_profiles.sql`. It adds OAuth provider
   metadata and private email storage, and updates the profile trigger to generate
   unique usernames for new provider accounts.
3. Run `migrations/20261116180000_profile_sync_onboarding.sql`. It adds profile
   synchronization, onboarding state, and avatar storage policies.
4. Run `migrations/20261116190000_rbac.sql`. It adds profile access fields,
   database-enforced permissions, and the admin-only profile access RPC. Keep
   these migrations in timestamp order.
5. Run `migrations/20261117100000_social_core_schema.sql` to add the social
   tables, constraints, indexes, functions, triggers, and RLS policies.
6. Run `migrations/20261117101000_storage_buckets.sql` to add private video,
   thumbnail, chat-media, and document buckets and their ownership policies.
7. Run `migrations/20261119213000_enable_like_realtime.sql` to enable the
   existing likes/video Realtime streams. Apply it only after
   `20261117100000_social_core_schema.sql`; it checks for the prerequisite
   tables and reports a clear error if the migration order is wrong.
8. Run `migrations/20261119223000_comments_edit_realtime.sql` to add the
   owner-only comment edit RPC and enable comment Realtime. It does not alter
   the comments table or relax its column grants.
9. After applying the timestamped migrations through
   `20261120100000_upload_video_metadata.sql`, run
   `migrations/20261120110000_follows_realtime.sql` to enable follow-row
   Realtime while retaining the participant-only SELECT policy.
10. `config.toml` loads repeatable reference data from `seeds/*.sql` after
    migrations when using `supabase start` or `supabase db reset`. A remote
    `db push` and the SQL Editor do not automatically run seeds; apply
    `seeds/001_report_reasons.sql` after the schema migrations in those cases.
11. In **Authentication → URL Configuration**, set the local Site URL to
    `http://localhost:3000` and allow `http://localhost:3000/reset-password`
    and `http://localhost:3000/auth/callback` (and the exact production URLs).
    Password reset requests redirect to `/reset-password`; auth callbacks remain
    in use for signup verification and OAuth.
    OAuth, signup verification, and password recovery use this callback. Add the
    production origin and its `/auth/callback` URL before deployment.
12. In **Authentication → Providers**, enable Google and GitHub and configure
    their client credentials. Register the Supabase project's
    `https://<project-ref>.supabase.co/auth/v1/callback` URL with each provider.
    Keep provider secrets in Supabase, never in frontend environment variables.
13. In **Authentication → Providers → Email**, keep email signup enabled and turn
    on email confirmations to require verification. Configure SMTP for production.
    To avoid email scanners consuming one-time links, configure the **Reset
    Password** template to show `{{ .Token }}` as a numeric recovery code and
    include a button linking to `{{ .RedirectTo }}`. Do not use
    `{{ .ConfirmationURL }}` as the only way to reset; it is a single-use link
    and scanners may open it before the user.
14. Keep the Supabase URL and public anon/publishable key in
    `frontend/.env.local`; never put a service-role key in frontend variables.

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
