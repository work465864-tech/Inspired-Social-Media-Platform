-- Structured upload metadata; caption remains the feed-compatible description.

alter table public.videos
  add column if not exists title text not null default '',
  add column if not exists description text not null default '';

alter table public.videos
  drop constraint if exists videos_title_length_check,
  drop constraint if exists videos_description_length_check;

alter table public.videos
  add constraint videos_title_length_check
    check (char_length(title) <= 100),
  add constraint videos_description_length_check
    check (char_length(description) <= 2200);
