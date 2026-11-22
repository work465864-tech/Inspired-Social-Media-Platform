# Connectly security architecture

For the full feature layout and authentication flow, see
[Authentication architecture](./authentication-architecture.md).

## Authentication and session flow

- Supabase Auth is the only credential, password, OAuth, token-refresh, and
  recovery provider. Do not add a parallel credential store or client-managed
  token lifecycle.
- `src/proxy.ts` validates protected requests with `auth.getUser()` through the
  Supabase SSR client. Invalid sessions are cleared locally; transient
  verification errors fail closed with a retryable response.
- Browser code should use `auth.getUser()` when a fresh identity check is
  required. `getSession()` is for reading the local session only and must not be
  used as proof of identity.
- `validateBrowserSession()` and the server-only `validateServerSession()`
  return minimal validity and account-status results. Do not log or persist
  access tokens, refresh tokens, passwords, email addresses, or raw user-agent
  strings.
- Set `NEXT_PUBLIC_REQUIRE_VERIFIED_EMAIL=true` to route protected UI to the
  verification flow until Supabase confirms the email. This is a presentation
  guard; production enforcement must also use Supabase Auth confirmation and
  appropriate RLS policies.
- The main route guard fails closed on missing profile data, and does not render
  protected UI for suspended or banned profiles. Database authorization must
  still enforce active status and permissions for every protected operation.

## Rate limiting and account protection

- Supabase Auth is authoritative for password verification and its configured
  request/email rate limits. Configure appropriate Auth rate limits and enable
  CAPTCHA/bot protection in the Supabase project for production.
- The client request gate is defense against duplicate submissions, not
  server-side throttling. Its local cooldown is not persisted across tabs,
  devices, or application instances.
- Login errors are normalized to user-safe messages; server/provider details
  are not exposed to login users.
- `RateLimitService` is a port for a future shared, server-side limiter. No
  in-memory or browser-side limiter is treated as brute-force protection.
  `useRequestGate()` only reduces accidental duplicate UI submissions.
- Temporary per-account lock state is intentionally not simulated. It requires
  a trusted server-side store and atomic updates, which this phase does not add.
- Suspended and banned states deny permissions in the RBAC database helper and
  block protected UI. Rate limits and UI guards are not substitutes for RLS.

## Permission flow

- Frontend permission helpers are for presentation and affordances only.
- Protected operations must call database policies or security-definer RPCs
  that validate `auth.uid()`, current role, and active account status.
- Do not trust role values in `user_metadata`, query parameters, browser
  storage, or client-supplied actor IDs. Roles belong in the server-managed
  profile/admin workflow.
- New features should add a permission to the shared permission vocabulary,
  role map, and database grants/policies together.

## Security services and future adapters

- Zod schemas normalize email and usernames, validate passwords, and validate
  profile text. Plain text must remain plain text in the UI; React's normal text
  rendering escapes markup. Do not use `dangerouslySetInnerHTML` for user data.
- Avatar uploads validate size, declared MIME type, file signature, decodable
  image content, and pixel dimensions before re-encoding. Supabase Storage RLS
  remains the ownership enforcement boundary.
- `isSameOriginMutation()` is a reusable Origin/Referer check for future
  cookie-authenticated mutation handlers. Next Server Actions and APIs should
  retain their framework protections and validate origin where applicable.
- `AuditLogSink`, `LoginActivitySink`, and `RateLimitService` are adapter
  contracts only. No audit or login history is stored until a trusted,
  access-controlled backend adapter is configured. Event metadata filters
  common secrets and identifiers; callers must still minimize event data.
- `LoginActivity` supports approximate device/browser summaries. Populate those
  values only from a trusted backend, avoid fingerprinting, and never store a
  raw IP or raw user-agent without a documented need and retention policy.
- Multi-device revocation, account-lock persistence, login history, alerting,
  background jobs, and security dashboards remain future work.

## Environment and deployment

- Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  explicitly public feature policy flags belong in frontend environment
  variables. Never expose a Supabase service-role key or provider secret.
- Configure strict production Site URL and redirect allowlists in Supabase.
- Deploy HTTPS, configure production Supabase Auth rate limits/CAPTCHA, enable
  email confirmation according to policy, and review RLS/storage policies
  before launch.
