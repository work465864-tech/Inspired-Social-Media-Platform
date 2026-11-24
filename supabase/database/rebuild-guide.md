# Rebuilding the Supabase database

## Important: preserve the migration units

The database source of truth is the ordered migration directory, not a single
standalone schema dump. Apply every migration below in filename order. Do not
copy the SQL into a newly flattened file or reorder statements by object type:
primary/foreign keys and constraints are intentionally declared with their
tables, and later migrations intentionally replace routines and update earlier
objects.

This guide covers the application schema in this repository. It assumes the
Supabase project itself is healthy and still provides its managed `auth`,
`storage`, and `supabase_realtime` objects. Do not manually recreate or drop
those Supabase-managed schemas. If `auth.users`, `storage.buckets`, or the
Realtime publication is missing, restore/recreate the Supabase project services
before applying these migrations.

The repository does not contain a `CREATE TYPE ... AS ENUM` or `CREATE VIEW`
statement. Those requested categories therefore have no application objects to
create; the schema uses checked text columns and RPC functions instead.

## Object dependency map

- `profiles` depends on Supabase Auth's `auth.users`; its foreign key and
  signup trigger are created by the first migration.
- OAuth metadata, profile synchronization, onboarding, and the public `avatars`
  bucket build on `profiles`. RBAC then adds role permissions and
  `has_permission()`.
- Social tables depend on `profiles`; `video_assets` also references the
  Supabase-managed `storage.buckets` relation. Their primary keys, foreign keys,
  and check/unique constraints are declared inline with table creation.
- Social authorization routines depend on the tables, `has_permission()`, and
  one another. Triggers are installed after the trigger functions they invoke.
- Storage object policies depend on the buckets and, for video access, the
  social tables and `can_view_video()` / `can_moderate_video()`.
- The analytics schema depends on profiles, videos, follows, and the
  `increment_video_views()` routine from the social schema.
- Search indexes depend on `pg_trgm` and their referenced tables/columns.
- The report-reason seed depends on `report_reasons`; apply it after all schema
  migrations.
- Realtime migrations depend on the Supabase `supabase_realtime` publication
  and the tables they add to it.

## Requested section order and placement rationale

These are the logical categories present in the SQL. They are already arranged
in dependency-safe order within the migrations; several categories share a
migration because that migration is an atomic, versioned change.

### 1. Extensions

`pg_trgm` is enabled in `20261120020000_search_trigram_indexes.sql`.

- **Why here:** the trigram operator class must exist before its GIN indexes.
- **Depends on:** Supabase PostgreSQL and permission to create/enable the
  extension.
- **If run too early or late:** it is safe to enable before the tables; running
  the index statements before the extension can fail with a missing operator
  class. The migration enables the extension before creating those indexes.

### 2. Custom Types (ENUMs)

There are no custom ENUM types in the repository. Statuses, visibility,
providers, and event types use `text` columns with `CHECK` constraints.

- **Why here:** custom types must exist before tables declare columns using
  them.
- **Depends on:** nothing in this schema.
- **If run too early or late:** no SQL block is required. Do not invent enums
  during a rebuild; that would change the existing schema/API contract.

### 3. Tables

Application tables are created in the Auth/profile, RBAC, social-core, and
creator-analytics migrations. The analytics event parent and its default
partition are included. `storage.buckets` and `auth.users` are Supabase-managed,
not application tables.

- **Why here:** tables provide the relations used by keys, indexes, routines,
  policies, and triggers.
- **Depends on:** Supabase-managed Auth and Storage relations; earlier parent
  tables such as `profiles` before dependent social tables.
- **If run too early or late:** dependent foreign keys and routines fail if
  their referenced relations do not exist. Keep the migration order.

### 4. Primary Keys

Primary keys are declared inline in `CREATE TABLE`, including composite keys,
identity-backed keys, and the analytics partition key.

- **Why here:** each table's identity/uniqueness contract is established when
  the table is created.
- **Depends on:** the table and key columns.
- **If run too early or late:** a separately extracted key phase would require
  rewriting the existing migrations and can invalidate dependent foreign keys
  or `ON CONFLICT` statements. Keep them inline.

### 5. Foreign Keys

Foreign keys are declared inline. The self-reference from comments and the
video-assets reference to `storage.buckets` are among the dependencies.

- **Why here:** relationships are established with the tables that own them.
- **Depends on:** the referenced relation and referenced unique/primary key.
- **If run too early or late:** missing parents/keys fail creation; delaying
  them can allow invalid data between phases. Do not split them from table
  creation.

### 6. Constraints

Check and unique constraints are mostly inline. Later migrations intentionally
add/replace constraints for notifications, upload metadata, and the expanded
video-size limit.

- **Why here:** constraints enforce valid data before normal application
  writes begin.
- **Depends on:** the table and columns (and any referenced key).
- **If run too early or late:** inline constraints cannot precede their table;
  running later constraint migrations out of order can fail or temporarily
  leave the schema with an older contract. Apply every migration in order.

### 7. Indexes

The social-core migration creates relational and query indexes. Later
migrations add trigram search indexes and discovery indexes; the analytics
migration creates its event/summary indexes.

- **Why here:** indexes depend on existing tables and columns; trigram indexes
  additionally depend on `pg_trgm`.
- **Depends on:** tables, columns, and for trigram indexes the extension.
- **If run too early or late:** early execution fails when a relation, column,
  or operator class is missing. Creating indexes after data load is possible
  but is not the ordering used by these migrations.

### 8. Functions

Functions include profile/Auth helpers, RBAC checks, social authorization and
counter helpers, RPCs, notification helpers, analytics ingestion, and
dashboard/statistics functions. Later migrations replace selected definitions
to extend behavior or return shapes.

- **Why here:** routines need the tables and types they reference.
- **Depends on:** relevant tables, columns, and prerequisite routines (for
  example, social authorization uses `has_permission()`).
- **If run too early or late:** a function may fail to compile or an earlier
  definition may overwrite later behavior. Run all migrations in order; do not
  omit a later `CREATE OR REPLACE` or intentional drop/recreate.

### 9. Triggers

Triggers maintain timestamps, counters, notifications, Auth-profile
synchronization, blocked follow edges, and analytics partitions.

- **Why here:** triggers bind table events to already-created trigger
  functions.
- **Depends on:** their table and trigger function; some notification triggers
  also depend on `create_notification()`.
- **If run too early:** trigger creation fails when a table or function is
  missing. Run after the relevant routine definitions, as each migration does.

### 10. Views

There are no database views or materialized views. Public creator statistics
are exposed as a table-returning RPC function, not a view.

- **Why here:** views normally depend on tables/functions and are created after
  those objects.
- **Depends on:** none; there is no view SQL to execute.
- **If run too early or late:** no view block exists. Do not create a view as a
  substitute for the existing RPC.

### 11. Storage Buckets

The onboarding migration creates/updates the public `avatars` bucket. The
storage-buckets migration creates/updates private video, thumbnail, chat-media,
and document buckets.

- **Why here:** bucket rows must exist before clients can store objects in
  those buckets.
- **Depends on:** Supabase Storage's managed schema.
- **If run too early or late:** missing Storage relations fail the migration;
  policies or application uploads cannot work until the bucket rows exist.

### 12. Storage Policies

Avatar policies are installed with onboarding; private-media object policies
are installed in the storage-buckets migration.

- **Why here:** policies need the `storage.objects` relation, bucket IDs, and
  the authorization helpers used to check video visibility/moderation.
- **Depends on:** Supabase Storage, bucket rows, profiles/RBAC, and social
  authorization functions.
- **If run too early:** policy creation or function resolution can fail. The
  migration ordering creates the required helper functions and buckets first.

### 13. Enable RLS

RLS is enabled for profiles, role permissions, all social tables, and all
analytics tables in their owning migrations.

- **Why here:** RLS must be active before client-facing policies are relied on.
- **Depends on:** the relevant table.
- **If run too early:** the table does not exist. If run after client access is
  granted, there can be an unintended access window. Each migration enables
  RLS before defining its policies.

### 14. RLS Policies

Policies cover profile access, social visibility/ownership/moderation,
analytics ownership, and Storage object access.

- **Why here:** policies attach to tables with RLS enabled and enforce the
  access model.
- **Depends on:** tables, RLS, and authorization helpers such as
  `has_permission()` and `can_view_video()`.
- **If run too early:** missing relations/functions cause errors. If omitted,
  RLS-enabled tables deny client access by default; do not disable RLS as a
  workaround.

### 15. Grants & Permissions

The migrations revoke broad table/function/sequence privileges and grant only
the operations needed by `anon`, `authenticated`, and trusted `service_role`
workflows.

- **Why here:** grants complement RLS; both the SQL privilege and policy must
  permit a client operation.
- **Depends on:** referenced tables, sequences, and functions.
- **If run too early:** grants can fail for missing objects. If omitted,
  intended API calls may fail; if made broader than the source, they can
  undermine RLS. Keep the exact migration grants.

### 16. Seed Data (if required)

`seeds/001_report_reasons.sql` inserts the repeatable report-reason reference
rows.

- **Why here:** the seed targets a table created by the social-core migration.
- **Depends on:** `public.report_reasons` and its unique `code` key.
- **If run too early:** insertion fails. It is an upsert and can be re-run.
  Never seed production user data.

### 17. RPC Functions

Supabase RPCs are PostgreSQL functions in the `public` schema; there is no
separate RPC object type. Examples include `toggle_like`,
`edit_my_comment`, `get_suggested_profiles`, analytics ingestion, and creator
statistics. Their execute grants are defined alongside them.

- **Why here:** RPC implementations depend on the tables and authorization
  logic; PostgREST exposes eligible granted functions.
- **Depends on:** function dependencies and explicit execute grants.
- **If run too early:** function creation can fail. If execute grants are
  missing, clients cannot call them; broader grants can expose privileged
  routines.

### 18. Realtime Configuration

The likes, videos, comments, bookmarks, notifications, and follows migrations
add their tables to the existing `supabase_realtime` publication.

- **Why here:** publication membership requires existing tables.
- **Depends on:** Supabase Realtime being enabled and the corresponding public
  tables.
- **If run too early:** the migration raises an explicit missing-publication or
  missing-table error. Realtime does not replace table grants or RLS.

### 19. Verification Queries

Run the catalog checks below after every migration and again after the seed.

- **Why here:** checks establish that expected relations, routines, indexes,
  triggers, RLS, policies, and buckets exist.
- **Depends on:** successful completion of the migrations and seed.
- **If run too early:** counts are incomplete and may look like missing objects;
  run them again after the final step.

## Step-by-step execution

### Choose one application route

For a clean local rebuild, use the Supabase CLI:

```powershell
supabase start
supabase db reset
```

`db reset` rebuilds the **local** database from migrations and configured seed
files; it does not restore a remote project.

For a remote project whose application objects were manually deleted, inspect
the remote migration history first. A normal `supabase db push` only applies
migrations that the remote migration ledger considers pending; it may do
nothing if the ledger still says the deleted schema is up to date. Do not run
both `db push` and the manual SQL sequence without checking history: that can
apply the same DDL twice. If the project has been fully reset/recreated and
migration history is empty, prefer the normal linked-project migration flow
(`supabase link --project-ref <project-ref>`, then `supabase db push`) and
review the proposed migration set before confirming.

If using the Supabase Dashboard SQL Editor to restore application objects,
run the following files **one file at a time**, in this order. The SQL Editor
does not update the CLI migration ledger; reconcile/check migration history
before any future `db push`.

### Run the migration files in order

1. Run `migrations/20261116160000_auth_profiles.sql`.
2. Verify it completed without errors. Stop if it did not; do not continue.
3. Run `migrations/20261116170000_oauth_profiles.sql`.
4. Verify success, then run `migrations/20261116180000_profile_sync_onboarding.sql`.
5. Verify success, then run `migrations/20261116190000_rbac.sql`.
6. Verify success, then run `migrations/20261117100000_social_core_schema.sql`.
7. Verify success, then run `migrations/20261117101000_storage_buckets.sql`.
8. Verify success, then run `migrations/20261119213000_enable_like_realtime.sql`.
9. Verify success, then run `migrations/20261119223000_comments_edit_realtime.sql`.
10. Verify success, then run `migrations/20261120001500_bookmarks_realtime.sql`.
11. Verify success, then run `migrations/20261120010000_notification_center.sql`.
12. Verify success, then run `migrations/20261120020000_search_trigram_indexes.sql`.
13. Verify success, then run `migrations/20261120030000_notifications_message_repair.sql`.
14. Verify success, then run `migrations/20261120040000_explore_discovery_indexes.sql`.
15. Verify success, then run `migrations/20261120100000_upload_video_metadata.sql`.
16. Verify success, then run `migrations/20261120110000_follows_realtime.sql`.
17. Verify success, then run `migrations/20261121100000_creator_analytics.sql`.
18. Verify success, then run `migrations/20261122190000_suggested_profiles_rpc.sql`.
19. Verify success, then run `migrations/20261123100000_expand_video_upload_limit.sql`.
20. Verify success, then run `migrations/20261123110000_public_profile_views_stat.sql`.
21. Verify all migrations succeeded, then run `seeds/001_report_reasons.sql`.
22. Run the verification queries below and check the application behavior in a
    staging project before relying on the restored database in production.

Do not skip a file because it appears small or repetitive. For example, the
notification message repair is intentionally retained as a versioned
compatibility migration; the final public-stats migration intentionally
replaces the earlier function's return shape.

## Verification queries

These queries report application objects in the relevant schemas. Catalog
counts can include Supabase-managed objects where noted; use the object-level
check as well as the counts.

### Object counts

```sql
select 'tables (public, including partitions)' as object_type, count(*) as object_count
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
union all
select 'views/materialized views (public)', count(*)
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('v', 'm')
union all
select 'functions (public)', count(*)
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
union all
select 'triggers (public and auth)', count(*)
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname in ('public', 'auth')
union all
select 'indexes (public)', count(*)
from pg_catalog.pg_index i
join pg_catalog.pg_class idx on idx.oid = i.indexrelid
join pg_catalog.pg_namespace n on n.oid = idx.relnamespace
where n.nspname = 'public'
  and i.indisvalid
union all
select 'RLS-enabled tables (public)', count(*)
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relrowsecurity
union all
select 'policies (public and storage)', count(*)
from pg_catalog.pg_policy p
join pg_catalog.pg_class c on c.oid = p.polrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
union all
select 'storage buckets', count(*)
from storage.buckets;
```

### Missing required RLS and Realtime objects

```sql
select c.relname as table_without_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relispartition
  and not c.relrowsecurity
order by c.relname;
```

```sql
select required.table_name,
       (publication_table.tablename is not null) as in_supabase_realtime
from (values
  ('likes'),
  ('videos'),
  ('comments'),
  ('bookmarks'),
  ('notifications'),
  ('follows')
) as required(table_name)
left join pg_catalog.pg_publication_tables publication_table
  on publication_table.pubname = 'supabase_realtime'
 and publication_table.schemaname = 'public'
 and publication_table.tablename = required.table_name
order by required.table_name;
```

### Required application tables and buckets

```sql
select required.table_name,
       (to_regclass('public.' || required.table_name) is not null) as exists
from (values
  ('profiles'), ('role_permissions'),
  ('videos'), ('video_assets'), ('video_views'), ('likes'), ('comments'),
  ('comment_likes'), ('follows'), ('bookmarks'), ('hashtags'),
  ('video_hashtags'), ('notifications'), ('report_reasons'), ('reports'),
  ('user_settings'), ('blocked_users'), ('saved_searches'),
  ('search_history'), ('devices'), ('audit_logs'),
  ('creator_analytics_events'), ('creator_analytics_events_default'),
  ('creator_analytics_daily'), ('creator_analytics_rate_limits'),
  ('creator_analytics_playbacks'), ('creator_analytics_sessions'),
  ('creator_analytics_viewer_videos')
) as required(table_name)
order by required.table_name;
```

```sql
select required.bucket_id,
       (bucket.id is not null) as exists,
       bucket.public,
       bucket.file_size_limit
from (values
  ('avatars'),
  ('videos-original'),
  ('videos-compressed'),
  ('thumbnails'),
  ('chat-media'),
  ('documents')
) as required(bucket_id)
left join storage.buckets bucket on bucket.id = required.bucket_id
order by required.bucket_id;
```

The expected application tables are listed explicitly above; the analytics
events parent has a default partition. Supabase-managed Auth/Storage relations
and platform-created objects are not included in the application-table list.
The verification queries confirm catalog state, not that policies behave
correctly for every role. Test representative `anon`, `authenticated`, and
trusted server workflows in staging.

## Final repository layout

```text
supabase/
  config.toml
  migrations/
    <all timestamped SQL migrations in the order listed above>
  seeds/
    001_report_reasons.sql
  database/
    README.md
    rebuild-guide.md
```

## Completion checklist

- [ ] Supabase-managed Auth, Storage, and Realtime services are available.
- [ ] All 19 timestamped migration files completed successfully, in order.
- [ ] The report-reason seed completed successfully.
- [ ] Required application tables and six buckets are present.
- [ ] Catalog checks show the expected public functions, indexes, and triggers.
- [ ] Every application table that should be private has RLS enabled.
- [ ] Storage and table policies are present; no unexpected broad grants were
      introduced.
- [ ] Realtime publication membership is true for all six listed tables.
- [ ] Role-based behavior and storage access were tested in staging.
- [ ] CLI migration history has been checked/reconciled before the next
      `supabase db push`.

This guide inventories the checked-in SQL; it cannot prove the remote project
has been restored or promise zero runtime errors without applying and testing
these migrations against that Supabase project.
