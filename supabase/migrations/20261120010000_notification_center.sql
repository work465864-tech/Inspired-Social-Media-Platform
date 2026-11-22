do $$
begin
  if pg_catalog.to_regclass('public.notifications') is null
    or pg_catalog.to_regclass('public.user_settings') is null
    or pg_catalog.to_regclass('public.videos') is null then
    raise exception
      'Missing notification prerequisites. Apply 20261117100000_social_core_schema.sql before enabling the notification center.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception
      'The supabase_realtime publication is missing. Enable Supabase Realtime before applying the notification migration.';
  end if;
end;
$$;

alter table public.notifications
  add column if not exists message text;

alter table public.notifications
  drop constraint if exists notifications_message_length_check;
alter table public.notifications
  add constraint notifications_message_length_check
  check (message is null or char_length(message) <= 2000);

alter table public.notifications
  drop constraint if exists notifications_event_type_check;
alter table public.notifications
  add constraint notifications_event_type_check
  check (
    event_type in (
      'like',
      'comment',
      'comment_reply',
      'comment_like',
      'follow',
      'follow_request',
      'follow_accepted',
      'mention',
      'share',
      'video_upload_success',
      'system',
      'admin'
    )
  );

alter table public.notifications
  drop constraint if exists notifications_target_check;
alter table public.notifications
  add constraint notifications_target_check
  check (
    (event_type in ('like', 'comment') and video_id is not null
      and comment_id is null and related_user_id is null)
    or (event_type in ('comment_reply', 'comment_like')
      and video_id is null and comment_id is not null
      and related_user_id is null)
    or (event_type in ('follow', 'follow_request', 'follow_accepted')
      and video_id is null and comment_id is null
      and related_user_id is not null)
    or (event_type in ('share', 'video_upload_success')
      and video_id is not null and comment_id is null
      and related_user_id is null)
    or (event_type = 'mention'
      and ((video_id is not null and comment_id is null)
        or (video_id is null and comment_id is not null))
      and related_user_id is null)
    or (event_type in ('system', 'admin')
      and video_id is null and comment_id is null
      and related_user_id is null)
  );

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
  notification_preferences jsonb;
  preference_key text;
begin
  if target_recipient_id is null
    or target_recipient_id = target_actor_id then
    return null;
  end if;

  preference_key := case
    when target_event_type in ('like', 'comment_like') then 'likes'
    when target_event_type in ('comment', 'comment_reply', 'mention')
      then 'comments'
    when target_event_type in ('follow', 'follow_request', 'follow_accepted')
      then 'follows'
    else null
  end;

  if preference_key is not null then
    select settings.notifications into notification_preferences
    from public.user_settings as settings
    where settings.user_id = target_recipient_id;

    if notification_preferences -> preference_key = 'false'::jsonb then
      return null;
    end if;
  end if;

  if target_event_type = 'video_upload_success'
    and exists (
      select 1
      from public.notifications as notifications
      where notifications.recipient_id = target_recipient_id
        and notifications.event_type = 'video_upload_success'
        and notifications.video_id = target_video_id
    ) then
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    event_type,
    video_id,
    comment_id,
    related_user_id,
    message
  )
  values (
    target_recipient_id,
    target_actor_id,
    target_event_type,
    target_video_id,
    target_comment_id,
    target_related_user_id,
    case target_event_type
      when 'video_upload_success' then 'Your video is ready to watch.'
      when 'system' then 'A Connectly system update is available.'
      when 'admin' then 'An administrator sent an announcement.'
      else null
    end
  )
  returning id into notification_id;

  return notification_id;
end;
$$;

create or replace function public.notify_video_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_notification(
    new.user_id,
    null,
    'video_upload_success',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists videos_notify_ready on public.videos;
create trigger videos_notify_ready
after update of status on public.videos
for each row
when (old.status is distinct from new.status and new.status = 'ready')
execute function public.notify_video_ready();

grant delete on public.notifications to authenticated;

drop policy if exists notifications_delete_recipient on public.notifications;
create policy notifications_delete_recipient
on public.notifications for delete to authenticated
using (recipient_id = (select auth.uid()));

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;
