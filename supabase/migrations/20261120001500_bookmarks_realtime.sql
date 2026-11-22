do $$
begin
  if pg_catalog.to_regclass('public.bookmarks') is null then
    raise exception
      'Missing public.bookmarks. Apply 20261117100000_social_core_schema.sql before enabling bookmark Realtime.';
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
      and tablename = 'bookmarks'
  ) then
    execute 'alter publication supabase_realtime add table public.bookmarks';
  end if;
end;
$$;
