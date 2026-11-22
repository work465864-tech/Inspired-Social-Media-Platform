-- Creator telemetry and public profile summaries.

create table if not exists public.creator_analytics_events (
  event_day date not null,
  event_id uuid not null,
  event_type text not null,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid references public.videos (id) on delete cascade,
  viewer_key text not null,
  viewer_kind text not null,
  session_id uuid not null,
  playback_id uuid,
  occurred_at timestamptz not null,
  watch_ms integer not null default 0,
  position_ms integer,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  primary key (event_day, event_id),
  constraint creator_analytics_event_type_check
    check (
      event_type in (
        'profile_visit',
        'video_impression',
        'video_start',
        'video_watch',
        'video_finish',
        'video_share'
      )
    ),
  constraint creator_analytics_viewer_key_check
    check (viewer_key ~ '^[a-f0-9]{64}$'),
  constraint creator_analytics_viewer_kind_check
    check (viewer_kind in ('authenticated', 'anonymous')),
  constraint creator_analytics_watch_ms_check
    check (watch_ms between 0 and 60000),
  constraint creator_analytics_position_check
    check (position_ms is null or position_ms >= 0),
  constraint creator_analytics_duration_check
    check (duration_ms is null or duration_ms > 0),
  constraint creator_analytics_metadata_check
    check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 2048),
  constraint creator_analytics_event_target_check
    check (
      (event_type = 'profile_visit' and video_id is null and playback_id is null)
      or (
        event_type <> 'profile_visit'
        and video_id is not null
        and (
          (event_type in ('video_start', 'video_watch', 'video_finish') and playback_id is not null)
          or (event_type in ('video_impression', 'video_share') and playback_id is null)
        )
      )
  ),
  constraint creator_analytics_event_payload_check
    check (
      (event_type = 'video_watch' or watch_ms = 0)
      and (
        event_type in ('video_start', 'video_watch', 'video_finish')
        or (position_ms is null and duration_ms is null)
      )
      and (event_type = 'video_share' or metadata = '{}'::jsonb)
    )
) partition by range (event_day);

create table if not exists public.creator_analytics_events_default
  partition of public.creator_analytics_events default;

create table if not exists public.creator_analytics_daily (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  event_day date not null,
  impressions_count bigint not null default 0,
  video_starts_count bigint not null default 0,
  video_finishes_count bigint not null default 0,
  video_shares_count bigint not null default 0,
  profile_visits_count bigint not null default 0,
  repeat_views_count bigint not null default 0,
  watch_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (creator_id, event_day),
  constraint creator_analytics_daily_counts_check
    check (
      impressions_count >= 0
      and video_starts_count >= 0
      and video_finishes_count >= 0
      and video_shares_count >= 0
      and profile_visits_count >= 0
      and repeat_views_count >= 0
      and watch_ms >= 0
    )
);

create table if not exists public.creator_analytics_rate_limits (
    viewer_key text primary key,
    window_started_at timestamptz not null,
    event_count integer not null,
    constraint creator_analytics_rate_limit_key_check
      check (viewer_key ~ '^[a-f0-9]{64}$'),
    constraint creator_analytics_rate_limit_count_check
      check (event_count between 1 and 500)
);

create table if not exists public.creator_analytics_playbacks (
  playback_id uuid primary key,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid references public.videos (id) on delete set null,
  viewer_key text not null,
  viewer_kind text not null,
  session_id uuid not null,
  started_at timestamptz not null,
  last_event_at timestamptz not null,
  watched_ms bigint not null default 0,
  max_position_ms integer not null default 0,
  duration_ms integer,
  completed_at timestamptz,
  constraint creator_analytics_playback_viewer_key_check
    check (viewer_key ~ '^[a-f0-9]{64}$'),
  constraint creator_analytics_playback_viewer_kind_check
    check (viewer_kind in ('authenticated', 'anonymous')),
  constraint creator_analytics_playback_watched_ms_check
    check (watched_ms >= 0),
  constraint creator_analytics_playback_position_check
    check (max_position_ms >= 0),
  constraint creator_analytics_playback_duration_check
    check (duration_ms is null or duration_ms > 0)
);

create table if not exists public.creator_analytics_sessions (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null,
  viewer_key text not null,
  viewer_kind text not null,
  started_at timestamptz not null,
  last_seen_at timestamptz not null,
  active_watch_ms bigint not null default 0,
  primary key (creator_id, session_id),
  constraint creator_analytics_session_viewer_key_check
    check (viewer_key ~ '^[a-f0-9]{64}$'),
  constraint creator_analytics_session_viewer_kind_check
    check (viewer_kind in ('authenticated', 'anonymous')),
  constraint creator_analytics_session_watch_ms_check
    check (active_watch_ms >= 0)
);

create table if not exists public.creator_analytics_viewer_videos (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  viewer_key text not null,
  first_view_at timestamptz not null,
  repeat_views_count bigint not null default 0,
  primary key (creator_id, video_id, viewer_key),
  constraint creator_analytics_viewer_video_key_check
    check (viewer_key ~ '^[a-f0-9]{64}$'),
  constraint creator_analytics_repeat_views_check
    check (repeat_views_count >= 0)
);

create index if not exists creator_analytics_events_creator_day_idx
  on public.creator_analytics_events (creator_id, event_day, event_type)
  include (video_id, watch_ms);

create index if not exists creator_analytics_events_video_day_idx
  on public.creator_analytics_events (video_id, event_day, event_type)
  where video_id is not null;

create index if not exists creator_analytics_events_profile_visit_idx
  on public.creator_analytics_events (creator_id, viewer_key, occurred_at desc)
  where event_type = 'profile_visit';

create index if not exists creator_analytics_daily_day_idx
  on public.creator_analytics_daily (creator_id, event_day desc);

create index if not exists creator_analytics_playbacks_creator_started_idx
  on public.creator_analytics_playbacks (creator_id, started_at desc);

create index if not exists creator_analytics_playbacks_unique_viewers_idx
  on public.creator_analytics_playbacks (creator_id, started_at, viewer_key);

create index if not exists creator_analytics_sessions_creator_started_idx
  on public.creator_analytics_sessions (creator_id, started_at desc);

alter table public.creator_analytics_events enable row level security;
alter table public.creator_analytics_daily enable row level security;
alter table public.creator_analytics_playbacks enable row level security;
alter table public.creator_analytics_sessions enable row level security;
alter table public.creator_analytics_viewer_videos enable row level security;
alter table public.creator_analytics_rate_limits enable row level security;

revoke all on public.creator_analytics_events from anon, authenticated;
revoke all on public.creator_analytics_daily from anon, authenticated;
revoke all on public.creator_analytics_playbacks from anon, authenticated;
revoke all on public.creator_analytics_sessions from anon, authenticated;
revoke all on public.creator_analytics_viewer_videos from anon, authenticated;
revoke all on public.creator_analytics_rate_limits from anon, authenticated;

grant select on public.creator_analytics_daily to authenticated;
grant all on public.creator_analytics_events to service_role;
grant all on public.creator_analytics_daily to service_role;
grant all on public.creator_analytics_playbacks to service_role;
grant all on public.creator_analytics_sessions to service_role;
grant all on public.creator_analytics_viewer_videos to service_role;
grant all on public.creator_analytics_rate_limits to service_role;

drop policy if exists creator_analytics_daily_select_own
  on public.creator_analytics_daily;
create policy creator_analytics_daily_select_own
on public.creator_analytics_daily
for select to authenticated
using ((select auth.uid()) = creator_id);

create or replace function public.ensure_creator_analytics_partition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  month_start date := date_trunc('month', new.event_day)::date;
  month_end date := (date_trunc('month', new.event_day) + interval '1 month')::date;
  partition_name text := 'creator_analytics_events_' || to_char(new.event_day, 'YYYYMM');
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(partition_name, 0)
  );

  if pg_catalog.to_regclass('public.' || partition_name) is null then
    execute pg_catalog.format(
      'create table public.%I partition of public.creator_analytics_events for values from (%L) to (%L)',
      partition_name,
      month_start,
      month_end
    );
  end if;

  return new;
end;
$$;

revoke all on function public.ensure_creator_analytics_partition() from public, anon, authenticated;

drop trigger if exists creator_analytics_create_partition
  on public.creator_analytics_events;
create trigger creator_analytics_create_partition
before insert on public.creator_analytics_events
for each row
execute function public.ensure_creator_analytics_partition();

create or replace function public.ingest_creator_analytics_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  input_event jsonb;
  inserted_event public.creator_analytics_events%rowtype;
  event_id uuid;
  event_type text;
  creator_id uuid;
  video_id uuid;
  viewer_key text;
  viewer_kind text;
  session_id uuid;
  playback_id uuid;
  viewer_id uuid;
  inserted_playback_id uuid;
  occurred_at timestamptz;
  event_day date;
  watch_ms integer;
  accepted_watch_ms integer;
  position_ms integer;
  duration_ms integer;
  metadata jsonb;
  repeat_views bigint;
  new_completion boolean;
  batch_viewer_key text;
  batch_viewer_count integer;
  inserted_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Analytics ingestion requires a trusted server.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_events) <> 'array'
    or jsonb_array_length(p_events) > 50 then
    raise exception 'The analytics batch is invalid.'
      using errcode = '22023';
  end if;

  select
    count(distinct event.value ->> 'viewer_key'),
    min(event.value ->> 'viewer_key')
  into batch_viewer_count, batch_viewer_key
  from pg_catalog.jsonb_array_elements(p_events) as event(value);

  if batch_viewer_count <> 1
    or batch_viewer_key !~ '^[a-f0-9]{64}$' then
    raise exception 'The analytics batch has an invalid visitor.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('analytics-rate:' || batch_viewer_key, 0)
  );
  insert into public.creator_analytics_rate_limits (
    viewer_key,
    window_started_at,
    event_count
  )
  values (batch_viewer_key, pg_catalog.now(), jsonb_array_length(p_events))
  on conflict (viewer_key) do update
  set
    window_started_at = case
      when public.creator_analytics_rate_limits.window_started_at
        <= pg_catalog.now() - interval '1 minute'
        then pg_catalog.now()
      else public.creator_analytics_rate_limits.window_started_at
    end,
    event_count = case
      when public.creator_analytics_rate_limits.window_started_at
        <= pg_catalog.now() - interval '1 minute'
        then jsonb_array_length(p_events)
      else public.creator_analytics_rate_limits.event_count
        + jsonb_array_length(p_events)
    end
  where public.creator_analytics_rate_limits.window_started_at
      <= pg_catalog.now() - interval '1 minute'
    or public.creator_analytics_rate_limits.event_count
      + jsonb_array_length(p_events) <= 500;

  if not found then
    raise exception 'Analytics ingestion is temporarily rate limited.'
      using errcode = 'P0001';
  end if;

  for input_event in
    select value from pg_catalog.jsonb_array_elements(p_events) as events(value)
  loop
    repeat_views := 0;
    inserted_playback_id := null;
    accepted_watch_ms := 0;

    event_id := (input_event ->> 'event_id')::uuid;
    event_type := input_event ->> 'event_type';
    creator_id := (input_event ->> 'creator_id')::uuid;
    video_id := nullif(input_event ->> 'video_id', '')::uuid;
    viewer_key := input_event ->> 'viewer_key';
    viewer_kind := input_event ->> 'viewer_kind';
    session_id := (input_event ->> 'session_id')::uuid;
    playback_id := nullif(input_event ->> 'playback_id', '')::uuid;
    viewer_id := nullif(input_event ->> 'viewer_id', '')::uuid;
    occurred_at := (input_event ->> 'occurred_at')::timestamptz;
    event_day := (occurred_at at time zone 'UTC')::date;
    watch_ms := coalesce(nullif(input_event ->> 'watch_ms', '')::integer, 0);
    position_ms := nullif(input_event ->> 'position_ms', '')::integer;
    duration_ms := nullif(input_event ->> 'duration_ms', '')::integer;
    metadata := coalesce(input_event -> 'metadata', '{}'::jsonb);

    if event_type not in (
      'profile_visit',
      'video_impression',
      'video_start',
      'video_watch',
      'video_finish',
      'video_share'
    ) or viewer_key !~ '^[a-f0-9]{64}$'
      or viewer_kind not in ('authenticated', 'anonymous')
      or watch_ms < 0 or watch_ms > 60000
      or occurred_at < pg_catalog.now() - interval '1 hour'
      or occurred_at > pg_catalog.now() + interval '1 minute'
      or jsonb_typeof(metadata) <> 'object'
      or pg_catalog.octet_length(metadata::text) > 2048
      or (event_type <> 'video_watch' and watch_ms <> 0)
      or (
        event_type not in ('video_start', 'video_watch', 'video_finish')
        and (position_ms is not null or duration_ms is not null)
      )
      or (event_type <> 'video_share' and metadata <> '{}'::jsonb) then
      raise exception 'The analytics event is invalid.'
        using errcode = '22023';
    end if;

    if event_type = 'profile_visit' and viewer_kind = 'authenticated' then
      perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'profile-visit:' || creator_id::text || ':' || viewer_key,
          0
        )
      );

      if exists (
        select 1
        from public.creator_analytics_events as prior
        where prior.creator_id = creator_id
          and prior.viewer_key = viewer_key
          and prior.event_type = 'profile_visit'
          and prior.occurred_at > pg_catalog.now() - interval '30 minutes'
      ) then
        continue;
      end if;
    end if;

    insert into public.creator_analytics_events (
      event_day,
      event_id,
      event_type,
      creator_id,
      video_id,
      viewer_key,
      viewer_kind,
      session_id,
      playback_id,
      occurred_at,
      watch_ms,
      position_ms,
      duration_ms,
      metadata
    )
    values (
      event_day,
      event_id,
      event_type,
      creator_id,
      video_id,
      viewer_key,
      viewer_kind,
      session_id,
      playback_id,
      occurred_at,
      watch_ms,
      position_ms,
      duration_ms,
      metadata
    )
    on conflict (event_day, event_id) do nothing
    returning * into inserted_event;

    if not found then
      continue;
    end if;

    inserted_count := inserted_count + 1;
    new_completion := false;

    if event_type = 'video_start' then
      if video_id is null or playback_id is null or viewer_id is null then
        raise exception 'A video start requires a video, playback, and viewer.'
          using errcode = '22023';
      end if;

      insert into public.creator_analytics_playbacks (
        playback_id,
        creator_id,
        video_id,
        viewer_key,
        viewer_kind,
        session_id,
        started_at,
        last_event_at,
        duration_ms
      )
      values (
        playback_id,
        creator_id,
        video_id,
        viewer_key,
        viewer_kind,
        session_id,
        occurred_at,
        occurred_at,
        duration_ms
      )
      on conflict (playback_id) do nothing
      returning playback_id into inserted_playback_id;

      if found then
        perform public.increment_video_views(video_id, event_id, viewer_id);

        insert into public.creator_analytics_viewer_videos (
          creator_id,
          video_id,
          viewer_key,
          first_view_at
        )
        values (creator_id, video_id, viewer_key, occurred_at)
        on conflict (creator_id, video_id, viewer_key) do update
        set repeat_views_count =
          public.creator_analytics_viewer_videos.repeat_views_count + 1
        returning repeat_views_count into repeat_views;
      end if;
    elsif event_type = 'video_watch' then
      update public.creator_analytics_playbacks as playbacks
      set
        last_event_at = greatest(playbacks.last_event_at, occurred_at),
        watched_ms = playbacks.watched_ms + watch_ms,
        max_position_ms = greatest(
          playbacks.max_position_ms,
          coalesce(position_ms, 0)
        ),
        duration_ms = coalesce(duration_ms, playbacks.duration_ms)
      where playbacks.playback_id = playback_id
        and playbacks.creator_id = creator_id
        and playbacks.video_id = video_id;
      if not found then
        raise exception 'The playback session is unavailable.'
          using errcode = '22023';
      end if;
      accepted_watch_ms := watch_ms;
    elsif event_type = 'video_finish' then
      update public.creator_analytics_playbacks as playbacks
      set
        last_event_at = greatest(playbacks.last_event_at, occurred_at),
        max_position_ms = greatest(
          playbacks.max_position_ms,
          coalesce(position_ms, 0)
        ),
        duration_ms = coalesce(duration_ms, playbacks.duration_ms),
        completed_at = occurred_at
      where playbacks.playback_id = playback_id
        and playbacks.creator_id = creator_id
        and playbacks.video_id = video_id
        and playbacks.completed_at is null;
      new_completion := found;
    end if;

    insert into public.creator_analytics_sessions (
      creator_id,
      session_id,
      viewer_key,
      viewer_kind,
      started_at,
      last_seen_at,
      active_watch_ms
    )
    values (
      creator_id,
      session_id,
      viewer_key,
      viewer_kind,
      occurred_at,
      occurred_at,
      accepted_watch_ms
    )
    on conflict (creator_id, session_id) do update
    set
      started_at = least(
        public.creator_analytics_sessions.started_at,
        excluded.started_at
      ),
      last_seen_at = greatest(
        public.creator_analytics_sessions.last_seen_at,
        excluded.last_seen_at
      ),
      active_watch_ms =
        public.creator_analytics_sessions.active_watch_ms
        + excluded.active_watch_ms;

    insert into public.creator_analytics_daily (
      creator_id,
      event_day,
      impressions_count,
      video_starts_count,
      video_finishes_count,
      video_shares_count,
      profile_visits_count,
      repeat_views_count,
      watch_ms
    )
    values (
      creator_id,
      event_day,
      case when event_type = 'video_impression' then 1 else 0 end,
      case
        when event_type = 'video_start' and inserted_playback_id is not null
          then 1
        else 0
      end,
      case when new_completion then 1 else 0 end,
      case when event_type = 'video_share' then 1 else 0 end,
      case when event_type = 'profile_visit' then 1 else 0 end,
      case
        when event_type = 'video_start'
          and inserted_playback_id is not null
          and repeat_views > 0
          then 1
        else 0
      end,
      accepted_watch_ms
    )
    on conflict (creator_id, event_day) do update
    set
      impressions_count =
        public.creator_analytics_daily.impressions_count
        + excluded.impressions_count,
      video_starts_count =
        public.creator_analytics_daily.video_starts_count
        + excluded.video_starts_count,
      video_finishes_count =
        public.creator_analytics_daily.video_finishes_count
        + excluded.video_finishes_count,
      video_shares_count =
        public.creator_analytics_daily.video_shares_count
        + excluded.video_shares_count,
      profile_visits_count =
        public.creator_analytics_daily.profile_visits_count
        + excluded.profile_visits_count,
      repeat_views_count =
        public.creator_analytics_daily.repeat_views_count
        + excluded.repeat_views_count,
      watch_ms = public.creator_analytics_daily.watch_ms + excluded.watch_ms,
      updated_at = pg_catalog.now();
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.ingest_creator_analytics_events(jsonb)
  from public, anon, authenticated;
grant execute on function public.ingest_creator_analytics_events(jsonb)
  to service_role;

create or replace function public.get_public_creator_stats(target_profile_id uuid)
returns table (
  followers_count bigint,
  following_count bigint,
  videos_count bigint,
  likes_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.follows as follows
      where follows.following_id = profiles.id
        and follows.status = 'accepted'
    ),
    (
      select count(*)
      from public.follows as follows
      where follows.follower_id = profiles.id
        and follows.status = 'accepted'
    ),
    (
      select count(*)
      from public.videos as videos
      where videos.user_id = profiles.id
        and videos.status = 'ready'
        and videos.deleted_at is null
        and public.can_view_video(videos.id)
    ),
    (
      select coalesce(sum(videos.likes_count), 0)
      from public.videos as videos
      where videos.user_id = profiles.id
        and videos.status = 'ready'
        and videos.deleted_at is null
        and public.can_view_video(videos.id)
    )
  from public.profiles as profiles
  where profiles.id = target_profile_id
    and profiles.status = 'active';
$$;

revoke all on function public.get_public_creator_stats(uuid)
  from public;
grant execute on function public.get_public_creator_stats(uuid)
  to anon, authenticated;

create or replace function public.delete_my_video(target_video_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or not public.has_permission('videos:upload') then
    raise exception 'Video management is unavailable.'
      using errcode = '42501';
  end if;

  update public.videos as videos
  set status = 'deleted', deleted_at = pg_catalog.now()
  where videos.id = target_video_id
    and videos.user_id = current_user_id
    and videos.deleted_at is null;

  return found;
end;
$$;

create or replace function public.update_my_video_metadata(
  target_video_id uuid,
  new_title text,
  new_caption text,
  new_visibility text,
  new_hashtags text[]
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_tag text;
  tag_id bigint;
begin
  if current_user_id is null
    or not exists (
      select 1
      from public.profiles as profiles
      where profiles.id = current_user_id
        and profiles.status = 'active'
    )
    or not public.has_permission('videos:upload')
    or new_title is null
    or char_length(btrim(new_title)) not between 1 and 160
    or new_caption is null
    or char_length(new_caption) > 2200
    or new_visibility is null
    or new_visibility not in ('public', 'followers', 'private')
    or coalesce(array_length(new_hashtags, 1), 0) > 30 then
    raise exception 'The video metadata is invalid.'
      using errcode = '22023';
  end if;

  update public.videos as videos
  set
    title = btrim(new_title),
    caption = btrim(new_caption),
    visibility = new_visibility,
    updated_at = pg_catalog.now()
  where videos.id = target_video_id
    and videos.user_id = current_user_id
    and videos.status in ('ready', 'draft', 'failed')
    and videos.deleted_at is null;

  if not found then
    raise exception 'The video is unavailable.'
      using errcode = 'P0002';
  end if;

  delete from public.video_hashtags as video_hashtags
  where video_hashtags.video_id = target_video_id;

  foreach normalized_tag in array coalesce(new_hashtags, array[]::text[])
  loop
    normalized_tag := lower(
      regexp_replace(btrim(normalized_tag), '^#+', '')
    );
    if normalized_tag = '' then
      continue;
    end if;
    if normalized_tag !~ '^[a-z0-9_]{1,64}$' then
      raise exception 'A hashtag is invalid.'
        using errcode = '22023';
    end if;

    insert into public.hashtags (slug)
    values (normalized_tag)
    on conflict (slug) do update set slug = excluded.slug
    returning id into tag_id;

    insert into public.video_hashtags (video_id, hashtag_id)
    values (target_video_id, tag_id)
    on conflict do nothing;
  end loop;

  return true;
end;
$$;

revoke all on function public.update_my_video_metadata(uuid, text, text, text, text[])
  from public, anon;
grant execute on function public.update_my_video_metadata(uuid, text, text, text, text[])
  to authenticated;

create or replace function public.get_creator_dashboard_snapshot(
  target_creator_id uuid,
  range_start date,
  range_end date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  range_start_at timestamptz := range_start::timestamp at time zone 'UTC';
  range_end_at timestamptz := (range_end + 1)::timestamp at time zone 'UTC';
begin
  if coalesce(auth.role(), '') <> 'service_role'
    or target_creator_id is null
    or range_start is null
    or range_end is null
    or range_end < range_start
    or range_end - range_start > 90 then
    raise exception 'The dashboard query is invalid.'
      using errcode = '22023';
  end if;

  select pg_catalog.jsonb_build_object(
    'totals',
    pg_catalog.jsonb_build_object(
      'videos',
      count(*) filter (
        where videos.status = 'ready' and videos.deleted_at is null
      ),
      'drafts',
      count(*) filter (
        where videos.status in ('draft', 'processing', 'failed')
          and videos.deleted_at is null
      ),
      'views',
      coalesce(
        sum(videos.views_count) filter (
          where videos.status = 'ready' and videos.deleted_at is null
        ),
        0
      ),
      'likes',
      coalesce(
        sum(videos.likes_count) filter (
          where videos.status = 'ready' and videos.deleted_at is null
        ),
        0
      ),
      'comments',
      coalesce(
        sum(videos.comments_count) filter (
          where videos.status = 'ready' and videos.deleted_at is null
        ),
        0
      )
    )
  )
  into snapshot
  from public.videos as videos
  where videos.user_id = target_creator_id;

  snapshot := snapshot || pg_catalog.jsonb_build_object(
    'followers',
    (
      select count(*)
      from public.follows as follows
      where follows.following_id = target_creator_id
        and follows.status = 'accepted'
    ),
    'following',
    (
      select count(*)
      from public.follows as follows
      where follows.follower_id = target_creator_id
        and follows.status = 'accepted'
    ),
    'analytics',
    (
      select pg_catalog.jsonb_build_object(
        'impressions',
        coalesce(sum(daily.impressions_count), 0),
        'starts',
        coalesce(sum(daily.video_starts_count), 0),
        'finishes',
        coalesce(sum(daily.video_finishes_count), 0),
        'shares',
        coalesce(sum(daily.video_shares_count), 0),
        'profileVisits',
        coalesce(sum(daily.profile_visits_count), 0),
        'repeatViews',
        coalesce(sum(daily.repeat_views_count), 0),
        'watchMs',
        coalesce(sum(daily.watch_ms), 0),
        'uniqueViewers',
        (
          select count(distinct playbacks.viewer_key)
          from public.creator_analytics_playbacks as playbacks
          where playbacks.creator_id = target_creator_id
            and playbacks.started_at >= range_start_at
            and playbacks.started_at < range_end_at
        ),
        'completionRate',
        coalesce(
          (
            select count(*) filter (where playbacks.completed_at is not null)::numeric
              / nullif(count(*), 0)
            from public.creator_analytics_playbacks as playbacks
            where playbacks.creator_id = target_creator_id
              and playbacks.started_at >= range_start_at
              and playbacks.started_at < range_end_at
          ),
          0
        ),
        'viewThroughRate',
        coalesce(
          (
            select avg(
              least(
                playbacks.max_position_ms::numeric
                  / nullif(playbacks.duration_ms, 0),
                1
              )
            )
            from public.creator_analytics_playbacks as playbacks
            where playbacks.creator_id = target_creator_id
              and playbacks.started_at >= range_start_at
              and playbacks.started_at < range_end_at
              and playbacks.duration_ms > 0
          ),
          0
        ),
        'averageWatchMs',
        coalesce(
          (
            select avg(playbacks.watched_ms)
            from public.creator_analytics_playbacks as playbacks
            where playbacks.creator_id = target_creator_id
              and playbacks.started_at >= range_start_at
              and playbacks.started_at < range_end_at
          ),
          0
        ),
        'averageSessionWatchMs',
        coalesce(
          (
            select avg(sessions.active_watch_ms)
            from public.creator_analytics_sessions as sessions
            where sessions.creator_id = target_creator_id
              and sessions.started_at >= range_start_at
              and sessions.started_at < range_end_at
              and sessions.active_watch_ms > 0
          ),
          0
        )
      )
      from public.creator_analytics_daily as daily
      where daily.creator_id = target_creator_id
        and daily.event_day between range_start and range_end
    ),
    'series',
    (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'day', calendar.day::date,
            'views', coalesce(daily.video_starts_count, 0),
            'impressions', coalesce(daily.impressions_count, 0),
            'watchMs', coalesce(daily.watch_ms, 0),
            'followers',
            (
              select count(*)
              from public.follows as follows
              where follows.following_id = target_creator_id
                and follows.status = 'accepted'
                and follows.created_at
                  < ((calendar.day::date + 1)::timestamp at time zone 'UTC')
            )
          )
          order by calendar.day
        ),
        '[]'::jsonb
      )
      from pg_catalog.generate_series(
        range_start::timestamp,
        range_end::timestamp,
        interval '1 day'
      ) as calendar(day)
      left join public.creator_analytics_daily as daily
        on daily.creator_id = target_creator_id
        and daily.event_day = calendar.day::date
    )
  );

  return snapshot;
end;
$$;

revoke all on function public.get_creator_dashboard_snapshot(uuid, date, date)
  from public, anon, authenticated;
grant execute on function public.get_creator_dashboard_snapshot(uuid, date, date)
  to service_role;
