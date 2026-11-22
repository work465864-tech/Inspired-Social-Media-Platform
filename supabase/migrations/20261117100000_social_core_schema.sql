-- Connectly core social schema.
-- Apply after 20261116190000_rbac.sql.

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  caption text not null default '',
  visibility text not null default 'public',
  status text not null default 'draft',
  allow_comments boolean not null default true,
  allow_remix boolean not null default true,
  duration_ms integer,
  views_count bigint not null default 0,
  likes_count bigint not null default 0,
  comments_count bigint not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_caption_length_check
    check (char_length(caption) <= 2200),
  constraint videos_visibility_check
    check (visibility in ('public', 'followers', 'private')),
  constraint videos_status_check
    check (status in ('draft', 'processing', 'ready', 'failed', 'hidden', 'deleted')),
  constraint videos_deleted_status_check
    check ((status = 'deleted') = (deleted_at is not null)),
  constraint videos_duration_check
    check (duration_ms is null or duration_ms > 0),
  constraint videos_counts_nonnegative_check
    check (views_count >= 0 and likes_count >= 0 and comments_count >= 0)
);

create table if not exists public.video_assets (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  asset_type text not null,
  variant_key text not null default 'default',
  bucket_id text not null references storage.buckets (id) on update cascade on delete restrict,
  object_path text not null,
  mime_type text not null,
  byte_size bigint not null,
  width integer,
  height integer,
  duration_ms integer,
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_assets_type_check
    check (asset_type in ('original', 'compressed', 'thumbnail')),
  constraint video_assets_bucket_type_check
    check (
      (asset_type = 'original' and bucket_id = 'videos-original')
      or (asset_type = 'compressed' and bucket_id = 'videos-compressed')
      or (asset_type = 'thumbnail' and bucket_id = 'thumbnails')
    ),
  constraint video_assets_variant_check
    check (variant_key ~ '^[a-z0-9][a-z0-9_-]{0,31}$'),
  constraint video_assets_object_path_check
    check (btrim(object_path) <> '' and object_path !~ '^/'),
  constraint video_assets_mime_type_check
    check (mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'),
  constraint video_assets_mime_matches_type_check
    check (
      (
        asset_type = 'original'
        and mime_type in ('video/mp4', 'video/quicktime', 'video/webm')
      )
      or (
        asset_type = 'compressed'
        and mime_type in ('video/mp4', 'video/webm')
      )
      or (
        asset_type = 'thumbnail'
        and mime_type in ('image/jpeg', 'image/png', 'image/webp')
      )
    ),
  constraint video_assets_size_check
    check (
      byte_size > 0
      and (
        (asset_type = 'thumbnail' and byte_size <= 5242880)
        or (
          asset_type in ('original', 'compressed')
          and byte_size <= 524288000
        )
      )
    ),
  constraint video_assets_dimensions_check
    check (
      (width is null and height is null)
      or (
        width is not null and width > 0
        and height is not null and height > 0
      )
    ),
  constraint video_assets_duration_check
    check (duration_ms is null or duration_ms > 0),
  constraint video_assets_checksum_check
    check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint video_assets_variant_unique
    unique (video_id, asset_type, variant_key),
  constraint video_assets_object_unique
    unique (bucket_id, object_path)
);

create table if not exists public.video_views (
  event_id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  viewer_id uuid references public.profiles (id) on delete set null,
  viewed_at timestamptz not null default now()
);

create table if not exists public.likes (
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_comment_id uuid,
  content text not null,
  likes_count bigint not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_content_length_check
    check (char_length(btrim(content)) between 1 and 2000),
  constraint comments_likes_nonnegative_check
    check (likes_count >= 0),
  constraint comments_not_own_parent_check
    check (parent_comment_id is null or parent_comment_id <> id),
  constraint comments_video_id_id_unique
    unique (video_id, id),
  constraint comments_parent_same_video_fk
    foreign key (video_id, parent_comment_id)
    references public.comments (video_id, id)
    on delete cascade
);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self_check
    check (follower_id <> following_id),
  constraint follows_status_check
    check (status in ('pending', 'accepted'))
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.hashtags (
  id bigint generated by default as identity primary key,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hashtags_slug_format_check
    check (slug = lower(slug) and slug ~ '^[a-z0-9_]{1,64}$'),
  constraint hashtags_slug_unique unique (slug)
);

create table if not exists public.video_hashtags (
  video_id uuid not null references public.videos (id) on delete cascade,
  hashtag_id bigint not null references public.hashtags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, hashtag_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  video_id uuid references public.videos (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  related_user_id uuid references public.profiles (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_event_type_check
    check (
      event_type in (
        'like',
        'comment',
        'comment_reply',
        'comment_like',
        'follow',
        'follow_request',
        'follow_accepted',
        'system'
      )
    ),
  constraint notifications_target_check
    check (
      (event_type in ('like', 'comment') and video_id is not null
        and comment_id is null and related_user_id is null)
      or (event_type in ('comment_reply', 'comment_like')
        and video_id is null and comment_id is not null
        and related_user_id is null)
      or (event_type in ('follow', 'follow_request', 'follow_accepted')
        and video_id is null and comment_id is null
        and related_user_id is not null)
      or (event_type = 'system' and video_id is null
        and comment_id is null and related_user_id is null)
    )
);

create table if not exists public.report_reasons (
  code text primary key,
  label text not null,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_reasons_code_check
    check (code ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint report_reasons_label_check
    check (char_length(btrim(label)) between 1 and 120),
  constraint report_reasons_sort_order_check
    check (sort_order >= 0)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason_code text not null references public.report_reasons (code) on delete restrict,
  target_user_id uuid references public.profiles (id) on delete cascade,
  target_video_id uuid references public.videos (id) on delete cascade,
  target_comment_id uuid references public.comments (id) on delete cascade,
  details text not null default '',
  status text not null default 'open',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_single_target_check
    check (num_nonnulls(target_user_id, target_video_id, target_comment_id) = 1),
  constraint reports_not_self_check
    check (target_user_id is null or target_user_id <> reporter_id),
  constraint reports_details_length_check
    check (char_length(details) <= 2000),
  constraint reports_status_check
    check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  constraint reports_review_fields_check
    check (
      (status = 'open' and reviewed_by is null and reviewed_at is null)
      or (
        status <> 'open'
        and reviewed_by is not null
        and reviewed_at is not null
      )
    ),
  constraint reports_resolution_length_check
    check (resolution is null or char_length(resolution) <= 2000)
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'system',
  language text not null default 'en',
  notifications jsonb not null default
    '{"push":true,"email":true,"likes":true,"comments":true,"follows":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_theme_check
    check (theme in ('light', 'dark', 'system')),
  constraint user_settings_language_check
    check (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint user_settings_notifications_object_check
    check (
      jsonb_typeof(notifications) = 'object'
      and octet_length(notifications::text) <= 4096
    )
);

create table if not exists public.blocked_users (
  user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  constraint blocked_users_not_self_check
    check (user_id <> blocked_user_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  query text not null,
  normalized_query text generated always as (lower(btrim(query))) stored,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_searches_query_check
    check (char_length(btrim(query)) between 1 and 200),
  constraint saved_searches_user_query_unique
    unique (user_id, normalized_query)
);

create table if not exists public.search_history (
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  query text not null,
  searched_at timestamptz not null default now(),
  constraint search_history_query_check
    check (char_length(btrim(query)) between 1 and 200)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_device_id uuid not null,
  label text,
  device_type text not null default 'unknown',
  browser_family text,
  os_family text,
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_type_check
    check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  constraint devices_label_length_check
    check (label is null or char_length(label) <= 120),
  constraint devices_browser_length_check
    check (browser_family is null or char_length(browser_family) <= 80),
  constraint devices_os_length_check
    check (os_family is null or char_length(os_family) <= 80),
  constraint devices_user_client_unique
    unique (user_id, client_device_id)
);

create table if not exists public.audit_logs (
  id bigint generated by default as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_check
    check (action ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  constraint audit_logs_entity_type_check
    check (entity_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint audit_logs_metadata_object_check
    check (
      jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 8192
    )
);

create index if not exists profiles_role_status_idx
  on public.profiles (role, status);

create index if not exists videos_owner_created_idx
  on public.videos (user_id, created_at desc, id desc);

create index if not exists videos_public_created_idx
  on public.videos (created_at desc, id desc)
  where status = 'ready' and visibility = 'public' and deleted_at is null;

create index if not exists videos_status_created_idx
  on public.videos (status, created_at desc)
  where deleted_at is null;

create index if not exists video_assets_video_idx
  on public.video_assets (video_id, asset_type);

create index if not exists video_views_video_time_idx
  on public.video_views (video_id, viewed_at desc);

create index if not exists video_views_viewer_time_idx
  on public.video_views (viewer_id, viewed_at desc)
  where viewer_id is not null;

create index if not exists likes_user_created_idx
  on public.likes (user_id, created_at desc);

create index if not exists comments_video_created_idx
  on public.comments (video_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists comments_parent_created_idx
  on public.comments (parent_comment_id, created_at, id)
  where parent_comment_id is not null and deleted_at is null;

create index if not exists comments_user_created_idx
  on public.comments (user_id, created_at desc);

create index if not exists comment_likes_user_created_idx
  on public.comment_likes (user_id, created_at desc);

create index if not exists follows_following_status_created_idx
  on public.follows (following_id, status, created_at desc);

create index if not exists follows_follower_status_created_idx
  on public.follows (follower_id, status, created_at desc);

create index if not exists blocked_users_blocked_user_idx
  on public.blocked_users (blocked_user_id, user_id);

create index if not exists bookmarks_video_idx
  on public.bookmarks (video_id, created_at desc);

create index if not exists video_hashtags_hashtag_video_idx
  on public.video_hashtags (hashtag_id, video_id);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc, id desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create index if not exists notifications_actor_created_idx
  on public.notifications (actor_id, created_at desc)
  where actor_id is not null;

create index if not exists notifications_video_idx
  on public.notifications (video_id)
  where video_id is not null;

create index if not exists notifications_comment_idx
  on public.notifications (comment_id)
  where comment_id is not null;

create index if not exists notifications_related_user_idx
  on public.notifications (related_user_id)
  where related_user_id is not null;

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create index if not exists reports_reason_created_idx
  on public.reports (reason_code, created_at desc);

create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);

create index if not exists reports_reviewer_idx
  on public.reports (reviewed_by)
  where reviewed_by is not null;

create index if not exists reports_target_video_idx
  on public.reports (target_video_id, created_at desc)
  where target_video_id is not null;

create index if not exists reports_target_comment_idx
  on public.reports (target_comment_id, created_at desc)
  where target_comment_id is not null;

create index if not exists reports_target_user_idx
  on public.reports (target_user_id, created_at desc)
  where target_user_id is not null;

create index if not exists saved_searches_user_last_used_idx
  on public.saved_searches (user_id, last_used_at desc);

create index if not exists search_history_user_searched_idx
  on public.search_history (user_id, searched_at desc);

create index if not exists devices_user_active_idx
  on public.devices (user_id, last_active_at desc)
  where revoked_at is null;

create index if not exists audit_logs_created_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc)
  where actor_id is not null;

create index if not exists audit_logs_entity_created_idx
  on public.audit_logs (entity_type, entity_id, created_at desc)
  where entity_id is not null;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.generate_unique_username(
  requested_username text,
  excluded_user_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate_username text;
  suffix text;
  attempt integer := 0;
begin
  perform pg_catalog.pg_advisory_xact_lock(781221, 2);

  base_username := pg_catalog.left(
    pg_catalog.lower(
      pg_catalog.regexp_replace(
        coalesce(requested_username, ''),
        '[^a-zA-Z0-9_]',
        '',
        'g'
      )
    ),
    24
  );

  if pg_catalog.char_length(base_username) < 3 then
    base_username := 'member';
  end if;

  loop
    if attempt = 0 then
      candidate_username := base_username;
    else
      suffix := attempt::text;
      candidate_username :=
        pg_catalog.left(
          base_username,
          greatest(1, 24 - pg_catalog.char_length(suffix) - 1)
        )
        || '_' || suffix;
    end if;

    if not exists (
      select 1
      from public.profiles as profiles
      where profiles.username = candidate_username
        and (excluded_user_id is null or profiles.id <> excluded_user_id)
    ) then
      return candidate_username;
    end if;

    attempt := attempt + 1;
    if attempt > 10000 then
      raise exception 'Unable to generate a unique username.'
        using errcode = '23505';
    end if;
  end loop;
end;
$$;

create or replace function public.can_view_video_for_user(
  target_video_id uuid,
  viewer_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.videos as videos
    join public.profiles as owners on owners.id = videos.user_id
    where videos.id = target_video_id
      and videos.deleted_at is null
      and (
        viewer_user_id is null
        or exists (
          select 1
          from public.profiles as viewers
          where viewers.id = viewer_user_id
            and viewers.status = 'active'
        )
      )
      and (
        (viewer_user_id is not null and videos.user_id = viewer_user_id)
        or (
          videos.status = 'ready'
          and owners.status = 'active'
          and (
            (
              viewer_user_id is null
              and videos.visibility = 'public'
              and owners.is_private = false
            )
            or (
              viewer_user_id is not null
              and videos.visibility in ('public', 'followers')
              and exists (
                select 1
                from public.follows as follows
                where follows.follower_id = viewer_user_id
                  and follows.following_id = videos.user_id
                  and follows.status = 'accepted'
              )
            )
            or (
              videos.visibility = 'public'
              and owners.is_private = false
            )
          )
          and not exists (
            select 1
            from public.blocked_users as blocks
            where
              (blocks.user_id = viewer_user_id
                and blocks.blocked_user_id = videos.user_id)
              or (blocks.user_id = videos.user_id
                and blocks.blocked_user_id = viewer_user_id)
          )
        )
      )
  );
$$;

create or replace function public.can_view_video(target_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_view_video_for_user(target_video_id, (select auth.uid()));
$$;

create or replace function public.can_moderate_video(target_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_permission('videos:hide')
    or (
      public.has_permission('reports:review')
      and exists (
        select 1
        from public.videos as videos
        join public.reports as reports
          on reports.status in ('open', 'reviewing')
        where videos.id = target_video_id
          and (
            reports.target_video_id = videos.id
            or reports.target_user_id = videos.user_id
            or exists (
              select 1 from public.comments as comments
              where comments.video_id = videos.id
                and comments.id = reports.target_comment_id
            )
          )
      )
    );
$$;

create or replace function public.increment_video_views(
  target_video_id uuid,
  view_event_id uuid,
  target_viewer_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_video_id uuid;
  existing_viewer_id uuid;
  current_views bigint;
begin
  if target_video_id is null or view_event_id is null then
    raise exception 'A video and idempotency key are required.'
      using errcode = '22023';
  end if;

  if not public.can_view_video_for_user(target_video_id, target_viewer_id) then
    raise exception 'The video is not available.'
      using errcode = '42501';
  end if;

  if target_viewer_id is not null and exists (
    select 1
    from public.videos as videos
    where videos.id = target_video_id
      and videos.user_id = target_viewer_id
  ) then
    select videos.views_count
    into current_views
    from public.videos as videos
    where videos.id = target_video_id;
    return current_views;
  end if;

  insert into public.video_views (event_id, video_id, viewer_id)
  values (view_event_id, target_video_id, target_viewer_id)
  on conflict (event_id) do nothing;

  if not found then
    select video_views.video_id, video_views.viewer_id
    into existing_video_id, existing_viewer_id
    from public.video_views as video_views
    where video_views.event_id = view_event_id;

    if existing_video_id is distinct from target_video_id
      or existing_viewer_id is distinct from target_viewer_id then
      raise exception 'The idempotency key was already used for another view.'
        using errcode = '22023';
    end if;
  end if;

  select videos.views_count
  into current_views
  from public.videos as videos
  where videos.id = target_video_id;

  return current_views;
end;
$$;

create or replace function public.toggle_like(target_video_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or not exists (
      select 1
      from public.profiles as profiles
      where profiles.id = current_user_id
        and profiles.status = 'active'
    )
    or not exists (
      select 1 from public.videos as videos
      where videos.id = target_video_id
        and videos.status = 'ready'
        and videos.deleted_at is null
    )
    or not public.can_view_video(target_video_id) then
    raise exception 'The video is not available for liking.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'like:' || current_user_id::text || ':' || target_video_id::text,
      0
    )
  );

  delete from public.likes as likes
  where likes.video_id = target_video_id
    and likes.user_id = current_user_id;

  if found then
    return false;
  end if;

  insert into public.likes (video_id, user_id)
  values (target_video_id, current_user_id);

  return true;
end;
$$;

create or replace function public.toggle_bookmark(target_video_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or not exists (
      select 1
      from public.profiles as profiles
      where profiles.id = current_user_id
        and profiles.status = 'active'
    )
    or not exists (
      select 1 from public.videos as videos
      where videos.id = target_video_id
        and videos.status = 'ready'
        and videos.deleted_at is null
    )
    or not public.can_view_video(target_video_id) then
    raise exception 'The video is not available for bookmarking.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'bookmark:' || current_user_id::text || ':' || target_video_id::text,
      0
    )
  );

  delete from public.bookmarks as bookmarks
  where bookmarks.user_id = current_user_id
    and bookmarks.video_id = target_video_id;

  if found then
    return false;
  end if;

  insert into public.bookmarks (user_id, video_id)
  values (current_user_id, target_video_id);

  return true;
end;
$$;

create or replace function public.toggle_follow(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_is_private boolean;
  follow_status text;
begin
  if current_user_id is null
    or current_user_id = target_user_id
    or not public.has_permission('users:follow') then
    raise exception 'The follow action is not allowed.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profiles
    where profiles.id = target_user_id
      and profiles.status = 'active'
  ) then
    raise exception 'The requested profile is unavailable.'
      using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'follow:' || case
        when current_user_id < target_user_id
          then current_user_id::text || ':' || target_user_id::text
        else target_user_id::text || ':' || current_user_id::text
      end,
      0
    )
  );

  if exists (
    select 1
    from public.blocked_users as blocks
    where (blocks.user_id = current_user_id
      and blocks.blocked_user_id = target_user_id)
      or (blocks.user_id = target_user_id
      and blocks.blocked_user_id = current_user_id)
  ) then
    raise exception 'The follow action is not allowed.'
      using errcode = '42501';
  end if;

  delete from public.follows as follows
  where follows.follower_id = current_user_id
    and follows.following_id = target_user_id;

  if found then
    return 'unfollowed';
  end if;

  select profiles.is_private
  into target_is_private
  from public.profiles as profiles
  where profiles.id = target_user_id;

  follow_status := case when target_is_private then 'pending' else 'accepted' end;

  insert into public.follows (follower_id, following_id, status)
  values (current_user_id, target_user_id, follow_status);

  return follow_status;
end;
$$;

create or replace function public.respond_to_follow_request(
  requesting_user_id uuid,
  accept_request boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or requesting_user_id is null
    or requesting_user_id = current_user_id
    or accept_request is null
    or not exists (
      select 1 from public.profiles as profiles
      where profiles.id = current_user_id
        and profiles.status = 'active'
    ) then
    raise exception 'The follow request is not available.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'follow:' || case
        when current_user_id < requesting_user_id
          then current_user_id::text || ':' || requesting_user_id::text
        else requesting_user_id::text || ':' || current_user_id::text
      end,
      0
    )
  );

  if accept_request then
    if exists (
      select 1
      from public.blocked_users as blocks
      where (blocks.user_id = current_user_id
        and blocks.blocked_user_id = requesting_user_id)
        or (blocks.user_id = requesting_user_id
        and blocks.blocked_user_id = current_user_id)
    ) then
      raise exception 'The follow request is not available.'
        using errcode = '42501';
    end if;

    update public.follows as follows
    set status = 'accepted'
    where follows.follower_id = requesting_user_id
      and follows.following_id = current_user_id
      and follows.status = 'pending';
    return found;
  end if;

  delete from public.follows as follows
  where follows.follower_id = requesting_user_id
    and follows.following_id = current_user_id
    and follows.status = 'pending';

  return found;
end;
$$;

create or replace function public.toggle_comment_like(target_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_video_id uuid;
begin
  select comments.video_id
  into target_video_id
  from public.comments as comments
  where comments.id = target_comment_id
    and comments.deleted_at is null;

  if current_user_id is null
    or target_video_id is null
    or not exists (
      select 1 from public.videos as videos
      where videos.id = target_video_id
        and videos.status = 'ready'
        and videos.deleted_at is null
    )
    or not public.can_view_video(target_video_id)
    or not exists (
      select 1 from public.profiles as profiles
      where profiles.id = current_user_id and profiles.status = 'active'
    ) then
    raise exception 'The comment is not available for liking.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'comment-like:' || current_user_id::text || ':' || target_comment_id::text,
      0
    )
  );

  delete from public.comment_likes as comment_likes
  where comment_likes.comment_id = target_comment_id
    and comment_likes.user_id = current_user_id;

  if found then
    return false;
  end if;

  insert into public.comment_likes (comment_id, user_id)
  values (target_comment_id, current_user_id);

  return true;
end;
$$;

create or replace function public.delete_my_video(target_video_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.'
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

create or replace function public.moderate_video(
  target_video_id uuid,
  target_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  can_delete boolean;
  current_status text;
begin
  if target_status is null
    or target_status not in ('ready', 'hidden', 'deleted') then
    raise exception 'Invalid moderation status.'
      using errcode = '22023';
  end if;

  if target_status = 'deleted' then
    can_delete := public.has_permission('videos:delete');
    if not can_delete then
      raise exception 'Permission denied.'
        using errcode = '42501';
    end if;
  elsif not public.has_permission('videos:hide') then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  select videos.status
  into current_status
  from public.videos as videos
  where videos.id = target_video_id
  for update;

  if not found then
    return false;
  end if;

  if (target_status = 'ready' and current_status <> 'hidden')
    or (target_status = 'hidden' and current_status <> 'ready') then
    raise exception 'The video cannot transition to the requested status.'
      using errcode = '22023';
  end if;

  if target_status = 'deleted' then
    if current_status = 'deleted' then
      return false;
    end if;
  end if;

  update public.videos as videos
  set
    status = target_status,
    deleted_at = case
      when target_status = 'deleted' then pg_catalog.now()
      else null
    end
  where videos.id = target_video_id;

  return found;
end;
$$;

create or replace function public.create_notification(
  target_recipient_id uuid,
  target_actor_id uuid,
  target_event_type text,
  target_video_id uuid default null,
  target_comment_id uuid default null,
  target_related_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_id uuid;
begin
  if target_recipient_id is null
    or target_recipient_id = target_actor_id then
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    event_type,
    video_id,
    comment_id,
    related_user_id
  )
  values (
    target_recipient_id,
    target_actor_id,
    target_event_type,
    target_video_id,
    target_comment_id,
    target_related_user_id
  )
  returning id into notification_id;

  return notification_id;
end;
$$;

create or replace function public.review_report(
  target_report_id uuid,
  target_status text,
  target_resolution text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or (
      not public.has_permission('reports:review')
      and not public.has_permission('reports:manage')
    ) then
    raise exception 'Permission denied.'
      using errcode = '42501';
  end if;

  if target_status is null
    or target_status not in ('reviewing', 'actioned', 'dismissed')
    or (target_resolution is not null
      and pg_catalog.char_length(target_resolution) > 2000) then
    raise exception 'Invalid report resolution.'
      using errcode = '22023';
  end if;

  update public.reports as reports
  set
    status = target_status,
    reviewed_by = current_user_id,
    reviewed_at = pg_catalog.now(),
    resolution = target_resolution
  where reports.id = target_report_id
    and reports.status in ('open', 'reviewing');

  return found;
end;
$$;

create or replace function public.bump_video_view_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.videos as videos
  set views_count = videos.views_count + 1
  where videos.id = new.video_id;
  return new;
end;
$$;

create or replace function public.bump_video_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.videos as videos
    set likes_count = videos.likes_count + 1
    where videos.id = new.video_id;
    return new;
  end if;

  update public.videos as videos
  set likes_count = greatest(0, videos.likes_count - 1)
  where videos.id = old.video_id;
  return old;
end;
$$;

create or replace function public.bump_video_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.videos as videos
    set comments_count = videos.comments_count + 1
    where videos.id = new.video_id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.videos as videos
      set comments_count = greatest(0, videos.comments_count - 1)
      where videos.id = new.video_id;
    elsif old.deleted_at is not null and new.deleted_at is null then
      update public.videos as videos
      set comments_count = videos.comments_count + 1
      where videos.id = new.video_id;
    end if;
    return new;
  end if;

  update public.videos as videos
  set comments_count = greatest(0, videos.comments_count - 1)
  where videos.id = old.video_id;
  return old;
end;
$$;

create or replace function public.bump_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments as comments
    set likes_count = comments.likes_count + 1
    where comments.id = new.comment_id;
    return new;
  end if;

  update public.comments as comments
  set likes_count = greatest(0, comments.likes_count - 1)
  where comments.id = old.comment_id;
  return old;
end;
$$;

create or replace function public.notify_video_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  video_owner_id uuid;
begin
  select videos.user_id into video_owner_id
  from public.videos as videos
  where videos.id = new.video_id;

  perform public.create_notification(
    video_owner_id, new.user_id, 'like', new.video_id
  );
  return new;
end;
$$;

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
begin
  if new.parent_comment_id is not null then
    select comments.user_id into recipient_id
    from public.comments as comments
    where comments.id = new.parent_comment_id;

    perform public.create_notification(
      recipient_id, new.user_id, 'comment_reply',
      null, new.id
    );
  else
    select videos.user_id into recipient_id
    from public.videos as videos
    where videos.id = new.video_id;

    perform public.create_notification(
      recipient_id, new.user_id, 'comment',
      new.video_id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.create_notification(
      new.following_id,
      new.follower_id,
      case when new.status = 'pending' then 'follow_request' else 'follow' end,
      null,
      null,
      new.follower_id
    );
  elsif old.status = 'pending' and new.status = 'accepted' then
    perform public.create_notification(
      new.follower_id,
      new.following_id,
      'follow_accepted',
      null,
      null,
      new.following_id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_comment_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment_owner_id uuid;
begin
  select comments.user_id into comment_owner_id
  from public.comments as comments
  where comments.id = new.comment_id;

  perform public.create_notification(
    comment_owner_id,
    new.user_id,
    'comment_like',
    null,
    new.comment_id
  );
  return new;
end;
$$;

create or replace function public.remove_blocked_follow_edges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'follow:' || case
        when new.user_id < new.blocked_user_id
          then new.user_id::text || ':' || new.blocked_user_id::text
        else new.blocked_user_id::text || ':' || new.user_id::text
      end,
      0
    )
  );

  delete from public.follows as follows
  where (follows.follower_id = new.user_id
      and follows.following_id = new.blocked_user_id)
    or (follows.follower_id = new.blocked_user_id
      and follows.following_id = new.user_id);
  return new;
end;
$$;

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
before update of caption, visibility, allow_comments, allow_remix, status, deleted_at
on public.videos
for each row execute function public.update_updated_at();

drop trigger if exists video_assets_set_updated_at on public.video_assets;
create trigger video_assets_set_updated_at
before update on public.video_assets
for each row execute function public.update_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.update_updated_at();

drop trigger if exists follows_set_updated_at on public.follows;
create trigger follows_set_updated_at
before update on public.follows
for each row execute function public.update_updated_at();

drop trigger if exists hashtags_set_updated_at on public.hashtags;
create trigger hashtags_set_updated_at
before update on public.hashtags
for each row execute function public.update_updated_at();

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.update_updated_at();

drop trigger if exists report_reasons_set_updated_at on public.report_reasons;
create trigger report_reasons_set_updated_at
before update on public.report_reasons
for each row execute function public.update_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.update_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.update_updated_at();

drop trigger if exists saved_searches_set_updated_at on public.saved_searches;
create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function public.update_updated_at();

drop trigger if exists devices_set_updated_at on public.devices;
create trigger devices_set_updated_at
before update on public.devices
for each row execute function public.update_updated_at();

drop trigger if exists video_views_after_insert on public.video_views;
create trigger video_views_after_insert
after insert on public.video_views
for each row execute function public.bump_video_view_count();

drop trigger if exists likes_after_insert_delete on public.likes;
create trigger likes_after_insert_delete
after insert or delete on public.likes
for each row execute function public.bump_video_like_count();

drop trigger if exists comments_after_insert_update_delete on public.comments;
create trigger comments_after_insert_update_delete
after insert or update of deleted_at or delete on public.comments
for each row execute function public.bump_video_comment_count();

drop trigger if exists comment_likes_after_insert_delete on public.comment_likes;
create trigger comment_likes_after_insert_delete
after insert or delete on public.comment_likes
for each row execute function public.bump_comment_like_count();

drop trigger if exists likes_notify_after_insert on public.likes;
create trigger likes_notify_after_insert
after insert on public.likes
for each row execute function public.notify_video_like();

drop trigger if exists comments_notify_after_insert on public.comments;
create trigger comments_notify_after_insert
after insert on public.comments
for each row execute function public.notify_comment();

drop trigger if exists follows_notify_after_change on public.follows;
create trigger follows_notify_after_change
after insert or update of status on public.follows
for each row execute function public.notify_follow();

drop trigger if exists comment_likes_notify_after_insert on public.comment_likes;
create trigger comment_likes_notify_after_insert
after insert on public.comment_likes
for each row execute function public.notify_comment_like();

drop trigger if exists blocked_users_remove_follow_edges on public.blocked_users;
create trigger blocked_users_remove_follow_edges
after insert on public.blocked_users
for each row execute function public.remove_blocked_follow_edges();

alter table public.videos enable row level security;
alter table public.video_assets enable row level security;
alter table public.video_views enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;
alter table public.bookmarks enable row level security;
alter table public.hashtags enable row level security;
alter table public.video_hashtags enable row level security;
alter table public.notifications enable row level security;
alter table public.report_reasons enable row level security;
alter table public.reports enable row level security;
alter table public.user_settings enable row level security;
alter table public.blocked_users enable row level security;
alter table public.saved_searches enable row level security;
alter table public.search_history enable row level security;
alter table public.devices enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.videos, public.video_assets, public.video_views,
  public.likes, public.comments, public.comment_likes, public.follows,
  public.bookmarks, public.hashtags, public.video_hashtags,
  public.notifications, public.report_reasons, public.reports,
  public.user_settings, public.blocked_users, public.saved_searches,
  public.search_history, public.devices, public.audit_logs
from public, anon, authenticated;

grant all on public.videos, public.video_assets, public.video_views,
  public.likes, public.comments, public.comment_likes, public.follows,
  public.bookmarks, public.hashtags, public.video_hashtags,
  public.notifications, public.report_reasons, public.reports,
  public.user_settings, public.blocked_users, public.saved_searches,
  public.search_history, public.devices
to service_role;

grant select, insert on public.audit_logs to service_role;

revoke all on sequence
  public.hashtags_id_seq,
  public.search_history_id_seq,
  public.audit_logs_id_seq
from public, anon, authenticated;

grant usage, select on sequence
  public.hashtags_id_seq,
  public.search_history_id_seq,
  public.audit_logs_id_seq
to service_role;

grant select on public.videos to anon, authenticated;
grant insert (user_id, caption, visibility, allow_comments, allow_remix)
  on public.videos to authenticated;
grant update (caption, visibility, allow_comments, allow_remix)
  on public.videos to authenticated;

grant select on public.video_assets to anon, authenticated;
grant select on public.likes to anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (video_id, user_id, parent_comment_id, content)
  on public.comments to authenticated;
grant update (deleted_at) on public.comments to authenticated;
grant select on public.comment_likes to authenticated;
grant select on public.follows to authenticated;
grant select on public.bookmarks to authenticated;
grant select on public.hashtags to anon, authenticated;
grant select, delete on public.video_hashtags to authenticated;
grant insert (video_id, hashtag_id)
  on public.video_hashtags to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select on public.report_reasons to anon, authenticated;
grant select on public.reports to authenticated;
grant insert (
  reporter_id,
  reason_code,
  target_user_id,
  target_video_id,
  target_comment_id,
  details
) on public.reports to authenticated;
grant select on public.user_settings to authenticated;
grant insert (user_id, theme, language, notifications)
  on public.user_settings to authenticated;
grant update (theme, language, notifications)
  on public.user_settings to authenticated;
grant select on public.blocked_users to authenticated;
grant insert (user_id, blocked_user_id)
  on public.blocked_users to authenticated;
grant delete on public.blocked_users to authenticated;
grant select on public.saved_searches to authenticated;
grant insert (user_id, query) on public.saved_searches to authenticated;
grant update (query, last_used_at)
  on public.saved_searches to authenticated;
grant delete on public.saved_searches to authenticated;
grant select on public.search_history to authenticated;
grant insert (user_id, query) on public.search_history to authenticated;
grant delete on public.search_history to authenticated;
grant select on public.devices to authenticated;

drop policy if exists videos_select_visible on public.videos;
create policy videos_select_visible
on public.videos for select to anon, authenticated
using (public.can_view_video(id));

drop policy if exists videos_select_moderation on public.videos;
create policy videos_select_moderation
on public.videos for select to authenticated
using (public.can_moderate_video(id));

drop policy if exists videos_insert_own_draft on public.videos;
create policy videos_insert_own_draft
on public.videos for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'draft'
  and deleted_at is null
  and exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
  )
);

drop policy if exists videos_update_own on public.videos;
create policy videos_update_own
on public.videos for update to authenticated
using (
  user_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
  )
)
with check (
  user_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
  )
);

drop policy if exists video_assets_select_public_derivatives on public.video_assets;
create policy video_assets_select_public_derivatives
on public.video_assets for select to anon
using (
  exists (
    select 1 from public.videos as videos
    where videos.id = video_assets.video_id
      and video_assets.asset_type in ('compressed', 'thumbnail')
      and public.can_view_video(videos.id)
  )
);

drop policy if exists video_assets_select_authenticated on public.video_assets;
create policy video_assets_select_authenticated
on public.video_assets for select to authenticated
using (
  exists (
    select 1 from public.videos as videos
    where videos.id = video_assets.video_id
      and (
        (
          video_assets.asset_type in ('compressed', 'thumbnail')
          and public.can_view_video(videos.id)
        )
        or videos.user_id = (select auth.uid())
        or public.can_moderate_video(videos.id)
      )
  )
);

drop policy if exists likes_select_visible_video on public.likes;
create policy likes_select_visible_video
on public.likes for select to anon, authenticated
using (public.can_view_video(video_id));

drop policy if exists comments_select_visible_video on public.comments;
create policy comments_select_visible_video
on public.comments for select to anon, authenticated
using (
  public.can_view_video(video_id)
  and (deleted_at is null or user_id = (select auth.uid()))
);

drop policy if exists comments_select_moderation on public.comments;
create policy comments_select_moderation
on public.comments for select to authenticated
using (
  public.has_permission('comments:delete:any')
  or public.can_moderate_video(video_id)
);

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own
on public.comments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1 from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
  )
  and exists (
    select 1 from public.videos as videos
    where videos.id = comments.video_id
      and videos.allow_comments
      and videos.status = 'ready'
      and public.can_view_video(videos.id)
  )
  and (
    parent_comment_id is null
    or exists (
      select 1 from public.comments as parent
      where parent.id = comments.parent_comment_id
        and parent.video_id = comments.video_id
        and parent.deleted_at is null
    )
  )
);

drop policy if exists comments_soft_delete_own_or_moderate on public.comments;
create policy comments_soft_delete_own_or_moderate
on public.comments for update to authenticated
using (
  deleted_at is null
  and (
    user_id = (select auth.uid())
    or public.has_permission('comments:delete:any')
  )
)
with check (
  deleted_at is not null
  and (
    user_id = (select auth.uid())
    or public.has_permission('comments:delete:any')
  )
);

drop policy if exists comment_likes_select_visible_comment on public.comment_likes;
create policy comment_likes_select_visible_comment
on public.comment_likes for select to authenticated
using (
  exists (
    select 1 from public.comments as comments
    where comments.id = comment_likes.comment_id
      and comments.deleted_at is null
      and public.can_view_video(comments.video_id)
  )
);

drop policy if exists follows_select_participant on public.follows;
create policy follows_select_participant
on public.follows for select to authenticated
using (
  follower_id = (select auth.uid())
  or following_id = (select auth.uid())
);

drop policy if exists bookmarks_select_own on public.bookmarks;
create policy bookmarks_select_own
on public.bookmarks for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists hashtags_select_active on public.hashtags;
create policy hashtags_select_active
on public.hashtags for select to anon, authenticated
using (true);

drop policy if exists video_hashtags_select_visible on public.video_hashtags;
create policy video_hashtags_select_visible
on public.video_hashtags for select to anon, authenticated
using (public.can_view_video(video_id));

drop policy if exists video_hashtags_insert_own_draft on public.video_hashtags;
create policy video_hashtags_insert_own_draft
on public.video_hashtags for insert to authenticated
with check (
  exists (
    select 1 from public.videos as videos
    where videos.id = video_hashtags.video_id
      and videos.user_id = (select auth.uid())
      and videos.status = 'draft'
      and videos.deleted_at is null
  )
);

drop policy if exists video_hashtags_delete_own_draft on public.video_hashtags;
create policy video_hashtags_delete_own_draft
on public.video_hashtags for delete to authenticated
using (
  exists (
    select 1 from public.videos as videos
    where videos.id = video_hashtags.video_id
      and videos.user_id = (select auth.uid())
      and videos.status = 'draft'
      and videos.deleted_at is null
  )
);

drop policy if exists notifications_select_recipient on public.notifications;
create policy notifications_select_recipient
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists notifications_update_recipient on public.notifications;
create policy notifications_update_recipient
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

drop policy if exists report_reasons_select_active on public.report_reasons;
create policy report_reasons_select_active
on public.report_reasons for select to anon, authenticated
using (is_active);

drop policy if exists reports_select_reporter on public.reports;
create policy reports_select_reporter
on public.reports for select to authenticated
using (reporter_id = (select auth.uid()));

drop policy if exists reports_select_moderation on public.reports;
create policy reports_select_moderation
on public.reports for select to authenticated
using (
  public.has_permission('reports:review')
  or public.has_permission('reports:manage')
);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
on public.reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1 from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
  )
  and exists (
    select 1 from public.report_reasons as reasons
    where reasons.code = reports.reason_code
      and reasons.is_active
  )
);

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own
on public.user_settings for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own
on public.user_settings for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own
on public.user_settings for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists blocked_users_select_own on public.blocked_users;
create policy blocked_users_select_own
on public.blocked_users for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists blocked_users_insert_own on public.blocked_users;
create policy blocked_users_insert_own
on public.blocked_users for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
  )
);

drop policy if exists blocked_users_delete_own on public.blocked_users;
create policy blocked_users_delete_own
on public.blocked_users for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists saved_searches_select_own on public.saved_searches;
create policy saved_searches_select_own
on public.saved_searches for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists saved_searches_insert_own on public.saved_searches;
create policy saved_searches_insert_own
on public.saved_searches for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists saved_searches_update_own on public.saved_searches;
create policy saved_searches_update_own
on public.saved_searches for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists saved_searches_delete_own on public.saved_searches;
create policy saved_searches_delete_own
on public.saved_searches for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists search_history_select_own on public.search_history;
create policy search_history_select_own
on public.search_history for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists search_history_insert_own on public.search_history;
create policy search_history_insert_own
on public.search_history for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists search_history_delete_own on public.search_history;
create policy search_history_delete_own
on public.search_history for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists devices_select_own on public.devices;
create policy devices_select_own
on public.devices for select to authenticated
using (user_id = (select auth.uid()));

revoke all on function public.update_updated_at()
  from public, anon, authenticated;
revoke all on function public.generate_unique_username(text, uuid)
  from public, anon, authenticated;
grant execute on function public.generate_unique_username(text, uuid)
  to service_role;
revoke all on function public.can_view_video_for_user(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.can_view_video(uuid)
  from public, anon, authenticated;
grant execute on function public.can_view_video(uuid)
  to anon, authenticated;
revoke all on function public.can_moderate_video(uuid)
  from public, anon, authenticated;
grant execute on function public.can_moderate_video(uuid)
  to authenticated;
revoke all on function public.increment_video_views(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.increment_video_views(uuid, uuid, uuid)
  to service_role;
revoke all on function public.toggle_like(uuid)
  from public, anon, authenticated;
grant execute on function public.toggle_like(uuid) to authenticated;
revoke all on function public.toggle_bookmark(uuid)
  from public, anon, authenticated;
grant execute on function public.toggle_bookmark(uuid) to authenticated;
revoke all on function public.toggle_follow(uuid)
  from public, anon, authenticated;
grant execute on function public.toggle_follow(uuid) to authenticated;
revoke all on function public.respond_to_follow_request(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.respond_to_follow_request(uuid, boolean)
  to authenticated;
revoke all on function public.toggle_comment_like(uuid)
  from public, anon, authenticated;
grant execute on function public.toggle_comment_like(uuid)
  to authenticated;
revoke all on function public.delete_my_video(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_my_video(uuid)
  to authenticated;
revoke all on function public.moderate_video(uuid, text)
  from public, anon, authenticated;
grant execute on function public.moderate_video(uuid, text)
  to authenticated;
revoke all on function public.create_notification(uuid, uuid, text, uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_notification(uuid, uuid, text, uuid, uuid, uuid)
  to service_role;
revoke all on function public.review_report(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_report(uuid, text, text)
  to authenticated;

revoke all on function public.bump_video_view_count()
  from public, anon, authenticated, service_role;
revoke all on function public.bump_video_like_count()
  from public, anon, authenticated, service_role;
revoke all on function public.bump_video_comment_count()
  from public, anon, authenticated, service_role;
revoke all on function public.bump_comment_like_count()
  from public, anon, authenticated, service_role;
revoke all on function public.notify_video_like()
  from public, anon, authenticated, service_role;
revoke all on function public.notify_comment()
  from public, anon, authenticated, service_role;
revoke all on function public.notify_follow()
  from public, anon, authenticated, service_role;
revoke all on function public.notify_comment_like()
  from public, anon, authenticated, service_role;
revoke all on function public.remove_blocked_follow_edges()
  from public, anon, authenticated, service_role;
