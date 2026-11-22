create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text not null,
  avatar_url text,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length_check
    check (char_length(username) between 3 and 24),
  constraint profiles_username_format_check
    check (username ~ '^[A-Za-z0-9_]+$'),
  constraint profiles_username_lowercase_check
    check (username = lower(username))
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_username text;
  profile_full_name text;
begin
  candidate_username := left(
    lower(
      regexp_replace(
        coalesce(new.raw_user_meta_data ->> 'username', ''),
        '[^A-Za-z0-9_]',
        '',
        'g'
      )
    ),
    24
  );

  if char_length(candidate_username) < 3 then
    candidate_username := 'member_' || left(replace(new.id::text, '-', ''), 12);
  end if;

  profile_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    'Connectly member'
  );

  insert into public.profiles (id, username, full_name, avatar_url, created_at)
  values (
    new.id,
    candidate_username,
    left(profile_full_name, 80),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

with normalized_users as (
  select
    users.id,
    case
      when char_length(cleaned.username) between 3 and 24 then cleaned.username
      else 'member_' || left(replace(users.id::text, '-', ''), 12)
    end as username,
    left(
      coalesce(
        nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
        'Connectly member'
      ),
      80
    ) as full_name,
    users.created_at
  from auth.users as users
  cross join lateral (
    select left(
      lower(
        regexp_replace(
          coalesce(users.raw_user_meta_data ->> 'username', ''),
          '[^A-Za-z0-9_]',
          '',
          'g'
        )
      ),
      24
    ) as username
  ) as cleaned
),
deduplicated_users as (
  select
    id,
    case
      when count(*) over (partition by lower(username)) > 1 then
        left(username, 13) || '_' || left(replace(id::text, '-', ''), 10)
      else username
    end as username,
    full_name,
    created_at
  from normalized_users
)
insert into public.profiles (id, username, full_name, created_at)
select id, username, full_name, coalesce(created_at, now())
from deduplicated_users
on conflict (id) do update
set
  username = coalesce(
    nullif(btrim(profiles.username), ''),
    excluded.username
  ),
  full_name = coalesce(
    nullif(btrim(profiles.full_name), ''),
    excluded.full_name
  );

update public.profiles
set username = 'member_' || left(replace(id::text, '-', ''), 16)
where username is null or btrim(username) = '';

update public.profiles
set full_name = 'Connectly member'
where full_name is null or btrim(full_name) = '';

alter table public.profiles
  alter column username set not null,
  alter column full_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_username_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_length_check
      check (char_length(username) between 3 and 24);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_username_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username ~ '^[A-Za-z0-9_]+$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_username_lowercase_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_lowercase_check
      check (username = lower(username));
  end if;
end;
$$;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, full_name, avatar_url, bio)
  on public.profiles to authenticated;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
