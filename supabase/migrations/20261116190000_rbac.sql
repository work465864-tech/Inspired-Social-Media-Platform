alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists status text not null default 'active',
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_private boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_format_check
      check (role ~ '^[a-z][a-z0-9_]{0,63}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('active', 'suspended', 'banned'));
  end if;
end;
$$;

update public.profiles as profiles
set role = case
  when users.raw_app_meta_data ->> 'role' in ('user', 'moderator', 'admin')
    then users.raw_app_meta_data ->> 'role'
  else profiles.role
end
from auth.users as users
where users.id = profiles.id
  and users.raw_app_meta_data ->> 'role' in ('user', 'moderator', 'admin')
  and profiles.role = 'user';

create table if not exists public.role_permissions (
  role text not null,
  permission text not null,
  primary key (role, permission)
);

alter table public.role_permissions enable row level security;
revoke all on public.role_permissions from public, anon, authenticated;

insert into public.role_permissions (role, permission)
values
  ('user', 'videos:upload'),
  ('user', 'comments:create'),
  ('user', 'comments:delete:own'),
  ('user', 'users:follow'),
  ('user', 'profiles:update:own'),
  ('moderator', 'videos:upload'),
  ('moderator', 'comments:create'),
  ('moderator', 'comments:delete:own'),
  ('moderator', 'users:follow'),
  ('moderator', 'profiles:update:own'),
  ('moderator', 'comments:delete:any'),
  ('moderator', 'reports:review'),
  ('moderator', 'videos:hide'),
  ('moderator', 'content:suspend'),
  ('admin', 'videos:upload'),
  ('admin', 'comments:create'),
  ('admin', 'comments:delete:own'),
  ('admin', 'users:follow'),
  ('admin', 'profiles:update:own'),
  ('admin', 'comments:delete:any'),
  ('admin', 'reports:review'),
  ('admin', 'videos:hide'),
  ('admin', 'content:suspend'),
  ('admin', 'videos:delete'),
  ('admin', 'admin:access'),
  ('admin', 'users:manage'),
  ('admin', 'moderators:manage'),
  ('admin', 'reports:manage'),
  ('admin', 'categories:manage'),
  ('admin', 'platform:settings:manage'),
  ('admin', 'users:verify')
on conflict (role, permission) do nothing;

create or replace function public.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
      and (
        profiles.role = 'admin'
        or exists (
          select 1
          from public.role_permissions as role_permissions
          where role_permissions.role = profiles.role
            and role_permissions.permission = requested_permission
        )
      )
  );
$$;

revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

create or replace function public.profile_payload(profile_row public.profiles)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', ($1).id,
    'username', ($1).username,
    'full_name', ($1).full_name,
    'avatar_url', ($1).avatar_url,
    'bio', ($1).bio,
    'role', ($1).role,
    'status', ($1).status,
    'is_verified', ($1).is_verified,
    'is_private', ($1).is_private,
    'created_at', ($1).created_at,
    'updated_at', ($1).updated_at,
    'onboarding_completed_at', ($1).onboarding_completed_at
  );
$$;

revoke all on function public.profile_payload(public.profiles)
  from public, anon, authenticated;

create or replace function public.ensure_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  auth_user auth.users%rowtype;
  profile_row public.profiles%rowtype;
  base_username text;
  candidate_username text;
  username_suffix text;
  profile_provider text;
  username_attempt integer := 0;
  private_account boolean := false;
begin
  if authenticated_user_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  select users.*
  into auth_user
  from auth.users as users
  where users.id = authenticated_user_id;

  if not found then
    raise exception 'The authenticated user could not be found.'
      using errcode = 'P0002';
  end if;

  profile_provider := case
    when auth_user.raw_app_meta_data ->> 'provider' in (
      'email',
      'google',
      'github',
      'apple',
      'facebook',
      'twitter',
      'discord'
    ) then auth_user.raw_app_meta_data ->> 'provider'
    else 'email'
  end;

  if jsonb_typeof(auth_user.raw_user_meta_data -> 'is_private') = 'boolean' then
    private_account := (auth_user.raw_user_meta_data ->> 'is_private')::boolean;
  end if;

  select profiles.*
  into profile_row
  from public.profiles as profiles
  where profiles.id = authenticated_user_id;

  if found then
    update public.profiles as profiles
    set
      email = auth_user.email,
      provider = profile_provider
    where profiles.id = authenticated_user_id
      and (
        profiles.email is distinct from auth_user.email
        or profiles.provider is distinct from profile_provider
      );

    select profiles.*
    into profile_row
    from public.profiles as profiles
    where profiles.id = authenticated_user_id;

    return public.profile_payload(profile_row);
  end if;

  base_username := left(
    lower(
      regexp_replace(
        coalesce(
          auth_user.raw_user_meta_data ->> 'username',
          auth_user.raw_user_meta_data ->> 'user_name',
          auth_user.raw_user_meta_data ->> 'preferred_username',
          split_part(coalesce(auth_user.email, ''), '@', 1)
        ),
        '[^A-Za-z0-9_]',
        '',
        'g'
      )
    ),
    24
  );

  if char_length(base_username) < 3 then
    base_username := 'member_' || left(replace(authenticated_user_id::text, '-', ''), 16);
  end if;

  loop
    if username_attempt = 0 then
      candidate_username := base_username;
    else
      username_suffix := username_attempt::text;
      candidate_username :=
        left(base_username, greatest(1, 24 - char_length(username_suffix) - 1))
        || '_'
        || username_suffix;
    end if;

    begin
      insert into public.profiles (
        id,
        username,
        full_name,
        email,
        avatar_url,
        bio,
        provider,
        is_private,
        created_at
      )
      values (
        authenticated_user_id,
        candidate_username,
        left(
          coalesce(
            nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
            nullif(btrim(auth_user.raw_user_meta_data ->> 'name'), ''),
            'Connectly member'
          ),
          80
        ),
        auth_user.email,
        coalesce(
          nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
          nullif(auth_user.raw_user_meta_data ->> 'picture', '')
        ),
        left(coalesce(auth_user.raw_user_meta_data ->> 'bio', ''), 160),
        profile_provider,
        private_account,
        coalesce(auth_user.created_at, now())
      )
      on conflict (id) do nothing
      returning *
      into profile_row;

      if found then
        return public.profile_payload(profile_row);
      end if;

      select profiles.*
      into profile_row
      from public.profiles as profiles
      where profiles.id = authenticated_user_id;

      if found then
        return public.profile_payload(profile_row);
      end if;
    exception
      when unique_violation then
        null;
    end;

    username_attempt := username_attempt + 1;
    if username_attempt > 10000 then
      raise exception 'Unable to generate a unique username.'
        using errcode = '23505';
    end if;
  end loop;
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

create or replace function public.complete_my_onboarding()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  profile_row public.profiles%rowtype;
begin
  if authenticated_user_id is null
    or not public.has_permission('profiles:update:own') then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  perform public.ensure_my_profile();

  update public.profiles as profiles
  set onboarding_completed_at = coalesce(profiles.onboarding_completed_at, now())
  where profiles.id = authenticated_user_id
    and char_length(profiles.username) between 3 and 24
    and btrim(profiles.full_name) <> ''
  returning profiles.*
  into profile_row;

  if not found then
    raise exception 'Complete your profile before finishing onboarding.'
      using errcode = '23514';
  end if;

  return public.profile_payload(profile_row);
end;
$$;

revoke all on function public.complete_my_onboarding() from public, anon;
grant execute on function public.complete_my_onboarding() to authenticated;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_provider text;
  can_edit_profile boolean;
begin
  auth_provider := case
    when new.raw_app_meta_data ->> 'provider' in (
      'email',
      'google',
      'github',
      'apple',
      'facebook',
      'twitter',
      'discord'
    ) then new.raw_app_meta_data ->> 'provider'
    else 'email'
  end;
  can_edit_profile := public.has_permission('profiles:update:own');

  update public.profiles as profiles
  set
    username = case
      when can_edit_profile
        and new.raw_user_meta_data ? 'username'
        and lower(btrim(new.raw_user_meta_data ->> 'username')) ~ '^[a-z0-9_]{3,24}$'
        then lower(btrim(new.raw_user_meta_data ->> 'username'))
      else profiles.username
    end,
    full_name = case
      when can_edit_profile and new.raw_user_meta_data ? 'full_name'
        then left(
          coalesce(
            nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
            profiles.full_name
          ),
          80
        )
      else profiles.full_name
    end,
    avatar_url = case
      when can_edit_profile and new.raw_user_meta_data ? 'avatar_url'
        then nullif(new.raw_user_meta_data ->> 'avatar_url', '')
      else profiles.avatar_url
    end,
    bio = case
      when can_edit_profile and new.raw_user_meta_data ? 'bio'
        then left(coalesce(new.raw_user_meta_data ->> 'bio', ''), 160)
      else profiles.bio
    end,
    is_private = case
      when can_edit_profile
        and jsonb_typeof(new.raw_user_meta_data -> 'is_private') = 'boolean'
        then (new.raw_user_meta_data ->> 'is_private')::boolean
      else profiles.is_private
    end,
    email = new.email,
    provider = auth_provider
  where profiles.id = new.id
    and (
      profiles.email is distinct from new.email
      or profiles.provider is distinct from auth_provider
      or (
        can_edit_profile
        and (
          (
            new.raw_user_meta_data ? 'username'
            and lower(btrim(new.raw_user_meta_data ->> 'username')) ~ '^[a-z0-9_]{3,24}$'
            and profiles.username is distinct from lower(
              btrim(new.raw_user_meta_data ->> 'username')
            )
          )
          or (
            new.raw_user_meta_data ? 'full_name'
            and profiles.full_name is distinct from left(
              coalesce(
                nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
                profiles.full_name
              ),
              80
            )
          )
          or (
            new.raw_user_meta_data ? 'avatar_url'
            and profiles.avatar_url is distinct from nullif(
              new.raw_user_meta_data ->> 'avatar_url',
              ''
            )
          )
          or (
            new.raw_user_meta_data ? 'bio'
            and profiles.bio is distinct from left(
              coalesce(new.raw_user_meta_data ->> 'bio', ''),
              160
            )
          )
          or (
            jsonb_typeof(new.raw_user_meta_data -> 'is_private') = 'boolean'
            and profiles.is_private is distinct from
              (new.raw_user_meta_data ->> 'is_private')::boolean
          )
        )
      )
    );

  return new;
end;
$$;

revoke all on function public.sync_profile_from_auth_user()
  from public, anon, authenticated;

drop trigger if exists sync_profile_after_auth_user_update on auth.users;
create trigger sync_profile_after_auth_user_update
after update of email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row
execute function public.sync_profile_from_auth_user();

grant select (role, is_verified, is_private)
  on public.profiles to anon, authenticated;

create or replace function public.set_profile_access(
  target_user_id uuid,
  target_role text,
  target_status text,
  target_is_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role text;
  current_status text;
  current_is_verified boolean;
  active_admin_count bigint;
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  if target_user_id is null
    or target_role is null
    or lower(btrim(target_role)) !~ '^[a-z][a-z0-9_]{0,63}$'
    or target_status is null
    or target_status not in ('active', 'suspended', 'banned')
    or target_is_verified is null then
    raise exception 'Invalid profile access settings.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(781221, 1);
  if not public.has_permission('users:manage') then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  select profiles.role, profiles.status, profiles.is_verified
  into current_role, current_status, current_is_verified
  from public.profiles as profiles
  where profiles.id = target_user_id;

  if not found then
    raise exception 'The requested profile does not exist.'
      using errcode = 'P0002';
  end if;

  if (current_role = 'moderator' or lower(btrim(target_role)) = 'moderator')
    and not public.has_permission('moderators:manage') then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  if lower(btrim(target_role)) = 'admin'
    and current_role <> 'admin'
    and not public.has_permission('admin:access') then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  if target_is_verified is distinct from current_is_verified
    and not public.has_permission('users:verify') then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  if current_role = 'admin' and current_status = 'active'
    and (
      lower(btrim(target_role)) <> 'admin'
      or target_status <> 'active'
    ) then
    select count(*)
    into active_admin_count
    from public.profiles as profiles
    where profiles.role = 'admin'
      and profiles.status = 'active';

    if active_admin_count <= 1 then
      raise exception 'The last active admin cannot be demoted or suspended.'
        using errcode = '23514';
    end if;
  end if;

  update public.profiles as profiles
  set
    role = lower(btrim(target_role)),
    status = target_status,
    is_verified = target_is_verified
  where profiles.id = target_user_id
  returning profiles.*
  into updated_profile;

  return jsonb_build_object(
    'id', updated_profile.id,
    'role', updated_profile.role,
    'status', updated_profile.status,
    'is_verified', updated_profile.is_verified
  );
end;
$$;

revoke all on function public.set_profile_access(uuid, text, text, boolean)
  from public, anon;
grant execute on function public.set_profile_access(uuid, text, text, boolean)
  to authenticated;

drop policy if exists "Users upload their own avatars" on storage.objects;
create policy "Users upload their own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and public.has_permission('profiles:update:own')
);

drop policy if exists "Users update their own avatars" on storage.objects;
create policy "Users update their own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and public.has_permission('profiles:update:own')
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and public.has_permission('profiles:update:own')
);

drop policy if exists "Users delete their own avatars" on storage.objects;
create policy "Users delete their own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and public.has_permission('profiles:update:own')
);
