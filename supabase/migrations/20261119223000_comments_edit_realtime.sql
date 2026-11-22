create or replace function public.edit_my_comment(
  target_comment_id uuid,
  new_content text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  updated_rows integer;
begin
  if current_user_id is null
    or not exists (
      select 1
      from public.profiles as profiles
      where profiles.id = current_user_id
        and profiles.status = 'active'
    ) then
    raise exception 'Sign in with an active account to edit comments.'
      using errcode = '42501';
  end if;

  if new_content is null
    or pg_catalog.char_length(pg_catalog.btrim(new_content)) not between 1 and 2000 then
    raise exception 'Comments must contain between 1 and 2,000 characters.'
      using errcode = '22023';
  end if;

  update public.comments as comments
  set content = pg_catalog.btrim(new_content),
      updated_at = pg_catalog.now()
  where comments.id = target_comment_id
    and comments.user_id = current_user_id
    and comments.deleted_at is null
    and exists (
      select 1
      from public.videos as videos
      where videos.id = comments.video_id
        and videos.status = 'ready'
        and videos.deleted_at is null
        and public.can_view_video(videos.id)
    );

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    raise exception 'The comment is not available for editing.'
      using errcode = '42501';
  end if;

  return true;
end;
$$;

revoke all on function public.edit_my_comment(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.edit_my_comment(uuid, text)
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception 'The supabase_realtime publication is required.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end;
$$;
