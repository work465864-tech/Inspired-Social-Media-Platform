alter table public.profiles
  add column if not exists email text,
  add column if not exists provider text not null default 'email';

alter table public.profiles
  drop constraint if exists profiles_provider_check;

alter table public.profiles
  add constraint profiles_provider_check
  check (provider in ('email', 'google', 'github', 'apple', 'facebook', 'twitter', 'discord'));

update public.profiles as profiles
set
  email = users.email,
  provider = case
    when users.raw_app_meta_data ->> 'provider' in (
      'google',
      'github',
      'apple',
      'facebook',
      'twitter',
      'discord'
    ) then users.raw_app_meta_data ->> 'provider'
    else 'email'
  end
from auth.users as users
where users.id = profiles.id;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate_username text;
  profile_full_name text;
  profile_provider text;
  username_attempt bigint := 0;
  username_suffix text;
begin
  if exists (
    select 1
    from public.profiles
    where id = new.id
  ) then
    return new;
  end if;

  profile_provider := case
    when new.raw_app_meta_data ->> 'provider' in (
      'google',
      'github',
      'apple',
      'facebook',
      'twitter',
      'discord'
    ) then new.raw_app_meta_data ->> 'provider'
    else 'email'
  end;

  base_username := left(
    lower(
      regexp_replace(
        coalesce(
          new.raw_user_meta_data ->> 'username',
          new.raw_user_meta_data ->> 'user_name',
          new.raw_user_meta_data ->> 'preferred_username',
          split_part(coalesce(new.email, ''), '@', 1)
        ),
        '[^A-Za-z0-9_]',
        '',
        'g'
      )
    ),
    24
  );

  if char_length(base_username) < 3 then
    base_username := 'member_' || left(replace(new.id::text, '-', ''), 16);
  end if;

  profile_full_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
      'Connectly member'
    ),
    80
  );

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
        provider,
        created_at
      )
      values (
        new.id,
        candidate_username,
        profile_full_name,
        new.email,
        coalesce(
          nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
          nullif(new.raw_user_meta_data ->> 'picture', '')
        ),
        profile_provider,
        coalesce(new.created_at, now())
      )
      on conflict (id) do nothing;

      if found or exists (
        select 1
        from public.profiles
        where id = new.id
      ) then
        return new;
      end if;
    exception
      when unique_violation then
        if exists (
          select 1
          from public.profiles
          where id = new.id
        ) then
          return new;
        end if;
    end;

    username_attempt := username_attempt + 1;
  end loop;
end;
$$;

revoke all on function public.handle_new_auth_user()
  from public, anon, authenticated;

revoke all on public.profiles from anon, authenticated;
grant select (
  id,
  username,
  full_name,
  avatar_url,
  bio,
  provider,
  created_at,
  updated_at
) on public.profiles to anon, authenticated;
grant update (username, full_name, avatar_url, bio)
  on public.profiles to authenticated;
