create index if not exists videos_ready_popular_idx
  on public.videos (views_count desc, created_at desc, id desc)
  where status = 'ready' and deleted_at is null;

create index if not exists profiles_active_created_idx
  on public.profiles (created_at desc, id)
  where status = 'active';
