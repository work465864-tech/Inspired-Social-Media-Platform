do $$
begin
  if pg_catalog.to_regclass('public.follows') is null then
    raise exception
      'Missing public.follows. Apply 20261117100000_social_core_schema.sql before enabling follow Realtime.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception
      'The supabase_realtime publication is missing. Enable Supabase Realtime before applying this migration.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'follows'
  ) then
    execute 'alter publication supabase_realtime add table public.follows';
  end if;
end;
$$;
