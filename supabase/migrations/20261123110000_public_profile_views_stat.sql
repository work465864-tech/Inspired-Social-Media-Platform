  drop function if exists public.get_public_creator_stats(uuid);

  create function public.get_public_creator_stats(target_profile_id uuid)
  returns table (
    followers_count bigint,
    following_count bigint,
    videos_count bigint,
    likes_count bigint,
    views_count bigint
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
      ),
      (
        select coalesce(sum(videos.views_count), 0)
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

  revoke all on function public.get_public_creator_stats(uuid) from public;
  grant execute on function public.get_public_creator_stats(uuid)
    to anon, authenticated;

  notify pgrst, 'reload schema';
