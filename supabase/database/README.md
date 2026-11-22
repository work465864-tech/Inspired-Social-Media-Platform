# Database source of truth

The ordered SQL migrations in `supabase/migrations/` define the schema. Do not
edit a deployed database manually and then leave the change out of a migration.
Use `supabase/seeds/` only for repeatable reference data; production user data
does not belong in seeds.

`frontend/src/types/database.types.ts` is a checked-in schema snapshot for
application code. It is not authoritative over SQL. After applying migrations
to the linked Supabase project, refresh it with:

```powershell
.\supabase\types\generate-types.ps1 -ProjectId <project-ref>
```

The generator requires the Supabase CLI and an authenticated/linkable project.
Review its output before committing. The current workspace has no linked local
or remote database, so the checked-in snapshot has not been generated against
an actual database instance.

See `docs/database-architecture.md` for relationships, RLS boundaries, storage
layout, scale considerations, and the migration sequence.
