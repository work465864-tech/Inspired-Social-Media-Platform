# Authentication architecture

## Module structure

Authentication is implemented as a feature module, with shared security and
RBAC modules:

```text
frontend/src/
  app/
    (auth)/                 Login, signup, recovery, verification routes
    (main)/                 Protected application routes and layouts
    auth/callback/          Server-side Supabase PKCE callback
    proxy.ts                Request-time session validation and route redirects
  features/
    auth/
      components/           Auth forms, route guards, profile onboarding
      context/              Auth context contract
      hooks/                Auth, session, OAuth, username hooks
      schemas/              Auth and profile Zod schemas
      services/             Supabase auth/profile/storage operations
      types/                Form and profile types
      utils/                Safe redirects and safe auth errors
    rbac/
      components/           Admin/moderator guards and permission UI
      constants/            Role-to-permission map
      hooks/                Role and permission hooks
      services/             Permission and access operations
      types/                Role, status, permission types
    security/
      hooks/                Request gate, session validation and policy hooks
      schemas/              Reusable security validation schemas
      services/             Session, rate-limit, CSRF, audit/activity ports
      types/                Security events and adapter contracts
      utils/                Text normalization and invalid-session detection
  providers/
    AuthProvider.tsx        One Supabase listener and shared auth/profile state
    ToastProvider.tsx       User-facing notifications
```

## Sign-up, login, and OAuth

- Email and password validation occurs with shared Zod schemas before calling
  Supabase Auth.
- Email signup includes user-editable profile metadata. Database migrations
  create a profile with unique username handling.
- Email/password login uses `signInWithPassword`. Login errors are normalized
  before display.
- Google and GitHub use Supabase OAuth with PKCE. The server callback exchanges
  the authorization code and validates the `next` path before redirecting.
- Password recovery uses Supabase email links and a verified recovery session;
  password changes are sent to Supabase Auth.
- Email verification and resend use Supabase Auth. Optional protected-route
  enforcement is configured with `NEXT_PUBLIC_REQUIRE_VERIFIED_EMAIL`.

## Session and profile lifecycle

- `AuthProvider` installs a single `onAuthStateChange` listener, restores
  persisted Supabase sessions, and loads/caches the current profile.
- Supabase owns token persistence and refresh. Server-side protected requests
  call `auth.getUser()` rather than trusting client-provided user data.
- Profile synchronization and first-time onboarding are backed by
  `ensure_my_profile()` and Auth metadata updates. Profile updates are
  optimistic in the client but persisted through Supabase Auth and a database
  trigger.
- The main route guard fails closed for missing profiles and for suspended or
  banned accounts. Database policies remain the enforcement boundary.

## Middleware and redirects

- `src/proxy.ts` allows configured public routes, validates sessions for
  protected paths, and redirects unauthenticated users to login with a safe
  return path.
- The auth callback and client safe-return helper reject protocol-relative and
  backslash paths to prevent external redirects.
- Client route guards are UX protection only. They are not a substitute for
  Supabase RLS, RPC authorization, or server checks.

## Roles and permissions

- Roles and statuses are stored in `public.profiles`. Server-managed role
  assignment must never accept `user_metadata` or client claims as authority.
- `features/rbac/constants/rolePermissions.ts` provides presentation helpers.
- `public.has_permission()` and row/storage policies are the trusted
  authorization layer. Protected database operations should check active
  status and permissions on every operation.
- Admin access changes use the `set_profile_access` RPC, which verifies caller
  permissions and prevents demoting/suspending the last active admin.
- Existing database permissions for future video/comment/report tables must be
  applied with those tables and policies; no such feature tables exist yet.

## Security and production configuration

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the optional
  public verification-policy flag are the only auth-specific frontend
  environment settings. Provider credentials stay in Supabase.
- Configure production Site URL and exact redirect allowlists, HTTPS, email
  confirmation/SMTP policy, Auth rate limits, CAPTCHA/bot protection, and RLS.
- Local request gating only prevents duplicate UI submissions. It does not
  replace Supabase or shared server-side throttling.
- Security audit/activity and rate-limit interfaces are adapter contracts only.
  No login history, persistent lockout, audit database, or multi-device logout
  is currently implemented.
- React renders user strings as text; do not use `dangerouslySetInnerHTML` for
  profile or authentication input.
- Avatar files are validated and re-encoded in the browser. Supabase Storage
  policies must continue to enforce per-user ownership.

For detailed security constraints and extension points, see
[Security architecture](./security-architecture.md). For exact Supabase
dashboard and migration setup, see [Supabase setup](../supabase/README.md).

## Flow validation boundaries

Local lint, strict type-check, production build, and browser-level route/form
checks do not validate live provider credentials or the deployed Supabase
project. Exercise Google/GitHub OAuth, email delivery, session refresh, account
status changes, RLS, Storage policies, and production redirects against a
staging Supabase project before launch.
