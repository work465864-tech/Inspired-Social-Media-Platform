create extension if not exists pg_trgm;

do $$
declare
  trigram_schema text;
begin
  select namespace.nspname
  into trigram_schema
  from pg_catalog.pg_opclass as operator_class
  join pg_catalog.pg_am as access_method
    on access_method.oid = operator_class.opcmethod
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = operator_class.opcnamespace
  where operator_class.opcname = 'gin_trgm_ops'
    and access_method.amname = 'gin'
    and operator_class.opcintype = 'text'::regtype
  order by case namespace.nspname
    when 'extensions' then 0
    when 'public' then 1
    else 2
  end
  limit 1;

  if trigram_schema is null then
    raise exception
      'pg_trgm GIN operator class is unavailable after enabling the pg_trgm extension.';
  end if;

  execute format(
    'create index if not exists profiles_username_trgm_idx
      on public.profiles using gin (username %I.gin_trgm_ops)
      where status = %L',
    trigram_schema,
    'active'
  );
  execute format(
    'create index if not exists profiles_full_name_trgm_idx
      on public.profiles using gin (full_name %I.gin_trgm_ops)
      where status = %L',
    trigram_schema,
    'active'
  );
  execute format(
    'create index if not exists videos_caption_search_trgm_idx
      on public.videos using gin (caption %I.gin_trgm_ops)
      where status = %L and deleted_at is null',
    trigram_schema,
    'ready'
  );
  execute format(
    'create index if not exists hashtags_slug_trgm_idx
      on public.hashtags using gin (slug %I.gin_trgm_ops)',
    trigram_schema
  );
end;
$$;
