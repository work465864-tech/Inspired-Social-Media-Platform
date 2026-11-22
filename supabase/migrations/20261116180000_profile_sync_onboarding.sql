alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.profiles'::regclass
      and attname = 'onboarding_completed_at'
      and not attisdropped
  ) then
    alter table public.profiles
      add column onboarding_completed_at timestamptz;

    update public.profiles
    set onboarding_completed_at = coalesce(updated_at, created_at, now())
    where onboarding_completed_at is null;
  end if;
end;
$$;

update public.profiles
set bio = left(bio, 160)
where char_length(bio) > 160;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_bio_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_check
      check (char_length(bio) <= 160);
  end if;
end;
$$;

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

  select profiles.*
  into profile_row
  from public.profiles as profiles
  where profiles.id = authenticated_user_id;

  if found then
    update public.profiles as profiles
    set
      username = case
        when auth_user.raw_user_meta_data ? 'username'
          and lower(btrim(auth_user.raw_user_meta_data ->> 'username')) ~ '^[a-z0-9_]{3,24}$'
          then lower(btrim(auth_user.raw_user_meta_data ->> 'username'))
        else profiles.username
      end,
      full_name = case
        when auth_user.raw_user_meta_data ? 'full_name'
          then left(
            coalesce(
              nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
              profiles.full_name
            ),
            80
          )
        else profiles.full_name
      end,
      avatar_url = case
        when auth_user.raw_user_meta_data ? 'avatar_url'
          then nullif(auth_user.raw_user_meta_data ->> 'avatar_url', '')
        else profiles.avatar_url
      end,
      bio = case
        when auth_user.raw_user_meta_data ? 'bio'
          then left(coalesce(auth_user.raw_user_meta_data ->> 'bio', ''), 160)
        else profiles.bio
      end,
      email = auth_user.email,
      provider = profile_provider
    where profiles.id = authenticated_user_id
      and (
        profiles.email is distinct from auth_user.email
        or (
          auth_user.raw_user_meta_data ? 'username'
          and lower(btrim(auth_user.raw_user_meta_data ->> 'username')) ~ '^[a-z0-9_]{3,24}$'
          and profiles.username is distinct from lower(btrim(auth_user.raw_user_meta_data ->> 'username'))
        )
        or (
          auth_user.raw_user_meta_data ? 'full_name'
          and profiles.full_name is distinct from left(
            coalesce(
              nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
              profiles.full_name
            ),
            80
          )
        )
        or (
          auth_user.raw_user_meta_data ? 'avatar_url'
          and profiles.avatar_url is distinct from nullif(auth_user.raw_user_meta_data ->> 'avatar_url', '')
        )
        or (
          auth_user.raw_user_meta_data ? 'bio'
          and profiles.bio is distinct from left(coalesce(auth_user.raw_user_meta_data ->> 'bio', ''), 160)
        )
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

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_provider text;
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

  update public.profiles as profiles
  set
    username = case
      when new.raw_user_meta_data ? 'username'
        and lower(btrim(new.raw_user_meta_data ->> 'username')) ~ '^[a-z0-9_]{3,24}$'
        then lower(btrim(new.raw_user_meta_data ->> 'username'))
      else profiles.username
    end,
    full_name = case
      when new.raw_user_meta_data ? 'full_name'
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
      when new.raw_user_meta_data ? 'avatar_url'
        then nullif(new.raw_user_meta_data ->> 'avatar_url', '')
      else profiles.avatar_url
    end,
    bio = case
      when new.raw_user_meta_data ? 'bio'
        then left(coalesce(new.raw_user_meta_data ->> 'bio', ''), 160)
      else profiles.bio
    end,
    email = new.email,
    provider = auth_provider
  where profiles.id = new.id;

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

drop policy if exists "Users can update their own profile" on public.profiles;
revoke update on public.profiles from anon, authenticated;
revoke update (username, full_name, avatar_url, bio)
  on public.profiles from authenticated;

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
  if authenticated_user_id is null then
    raise exception 'Authentication is required.'
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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatars" on storage.objects;
create policy "Users upload their own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users update their own avatars" on storage.objects;
create policy "Users update their own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users delete their own avatars" on storage.objects;
create policy "Users delete their own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
