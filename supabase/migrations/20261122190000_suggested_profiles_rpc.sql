create or replace function public.get_suggested_profiles(
  suggestion_limit integer default 8
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;
  if suggestion_limit is null or suggestion_limit < 1
    or suggestion_limit > 8 then
    raise exception 'The suggested profile limit is invalid.'
      using errcode = '22023';
  end if;

  return query
  select
    profiles.id,
    profiles.username,
    profiles.full_name,
    profiles.avatar_url,
    profiles.is_verified,
    profiles.created_at
  from public.profiles as profiles
  where profiles.status = 'active'
    and not profiles.is_private
    and profiles.id <> viewer_id
    and not exists (
      select 1
      from public.follows as follows
      where follows.follower_id = viewer_id
        and follows.following_id = profiles.id
    )
    and not exists (
      select 1
      from public.blocked_users as blocks
      where (blocks.user_id = viewer_id
        and blocks.blocked_user_id = profiles.id)
        or (blocks.user_id = profiles.id
          and blocks.blocked_user_id = viewer_id)
    )
  order by profiles.created_at desc, profiles.id desc
  limit suggestion_limit;
end;
$$;

revoke all on function public.get_suggested_profiles(integer)
  from public, anon;
grant execute on function public.get_suggested_profiles(integer)
  to authenticated;

grant select (is_private, is_verified)
  on public.profiles to anon, authenticated;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
to anon, authenticated
using (status = 'active');
