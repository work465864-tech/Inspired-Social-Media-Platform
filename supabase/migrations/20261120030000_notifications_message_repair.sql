do $$
begin
  if pg_catalog.to_regclass('public.notifications') is null then
    raise exception
      'Missing public.notifications. Apply 20261117100000_social_core_schema.sql first.';
  end if;
end;
$$;

alter table public.notifications
  add column if not exists message text;

notify pgrst, 'reload schema';
