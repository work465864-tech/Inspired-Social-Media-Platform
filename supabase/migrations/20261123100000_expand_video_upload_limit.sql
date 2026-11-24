update storage.buckets
set file_size_limit = 1073741824
where id in ('videos-original', 'videos-compressed');

alter table public.video_assets
  drop constraint if exists video_assets_size_check;

alter table public.video_assets
  add constraint video_assets_size_check
  check (
    byte_size > 0
    and (
      (asset_type = 'thumbnail' and byte_size <= 5242880)
      or (
        asset_type in ('original', 'compressed')
        and byte_size <= 1073741824
      )
    )
  );
