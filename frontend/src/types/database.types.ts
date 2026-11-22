// Schema snapshot aligned with the checked-in Supabase migrations.
// Regenerate against the linked project after applying migrations.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship<
  ForeignKeyName extends string = string,
  Columns extends string[] = string[],
  ReferencedRelation extends string = string,
  ReferencedColumns extends string[] = string[],
  IsOneToOne extends boolean = boolean,
> = {
  foreignKeyName: ForeignKeyName;
  columns: Columns;
  isOneToOne: IsOneToOne;
  referencedRelation: ReferencedRelation;
  referencedColumns: ReferencedColumns;
};

type ForeignKey<
  Name extends string,
  Column extends string,
  Relation extends string,
  ReferencedColumn extends string,
> = Relationship<Name, [Column], Relation, [ReferencedColumn], false>;

type CompositeForeignKey<
  Name extends string,
  ColumnOne extends string,
  ColumnTwo extends string,
  Relation extends string,
  ReferencedColumnOne extends string,
  ReferencedColumnTwo extends string,
> = Relationship<
  Name,
  [ColumnOne, ColumnTwo],
  Relation,
  [ReferencedColumnOne, ReferencedColumnTwo],
  false
>;

type OneToOneForeignKey<
  Name extends string,
  Column extends string,
  Relation extends string,
  ReferencedColumn extends string,
> = Relationship<Name, [Column], Relation, [ReferencedColumn], true>;

type Table<Row, Insert, Update, Relationships extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type ReadonlyTable<Row, Relationships extends Relationship[] = []> = Table<
  Row,
  never,
  never,
  Relationships
>;

type InsertOnly<
  Row,
  Writable extends keyof Row,
  Required extends Writable,
> = Pick<Row, Required> & Partial<Pick<Row, Writable>>;

type ProfileRow = {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string;
  provider: string;
  role: string;
  status: string;
  is_verified: boolean;
  is_private: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type VideoRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  caption: string;
  visibility: 'public' | 'followers' | 'private';
  status: 'draft' | 'processing' | 'ready' | 'failed' | 'hidden' | 'deleted';
  allow_comments: boolean;
  allow_remix: boolean;
  duration_ms: number | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type VideoAssetRow = {
  id: string;
  video_id: string;
  asset_type: 'original' | 'compressed' | 'thumbnail';
  variant_key: string;
  bucket_id: string;
  object_path: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  checksum_sha256: string | null;
  created_at: string;
  updated_at: string;
};

type VideoViewRow = {
  event_id: string;
  video_id: string;
  viewer_id: string | null;
  viewed_at: string;
};

type CreatorAnalyticsEventRow = {
  event_day: string;
  event_id: string;
  event_type:
    | 'profile_visit'
    | 'video_impression'
    | 'video_start'
    | 'video_watch'
    | 'video_finish'
    | 'video_share';
  creator_id: string;
  video_id: string | null;
  viewer_key: string;
  viewer_kind: 'authenticated' | 'anonymous';
  session_id: string;
  playback_id: string | null;
  occurred_at: string;
  watch_ms: number;
  position_ms: number | null;
  duration_ms: number | null;
  metadata: Json;
};

type CreatorAnalyticsDailyRow = {
  creator_id: string;
  event_day: string;
  impressions_count: number;
  video_starts_count: number;
  video_finishes_count: number;
  video_shares_count: number;
  profile_visits_count: number;
  repeat_views_count: number;
  watch_ms: number;
  updated_at: string;
};

type CreatorAnalyticsPlaybackRow = {
  playback_id: string;
  creator_id: string;
  video_id: string | null;
  viewer_key: string;
  viewer_kind: 'authenticated' | 'anonymous';
  session_id: string;
  started_at: string;
  last_event_at: string;
  watched_ms: number;
  max_position_ms: number;
  duration_ms: number | null;
  completed_at: string | null;
};

type CreatorAnalyticsSessionRow = {
  creator_id: string;
  session_id: string;
  viewer_key: string;
  viewer_kind: 'authenticated' | 'anonymous';
  started_at: string;
  last_seen_at: string;
  active_watch_ms: number;
};

type CreatorAnalyticsViewerVideoRow = {
  creator_id: string;
  video_id: string;
  viewer_key: string;
  first_view_at: string;
  repeat_views_count: number;
};

type CreatorAnalyticsRateLimitRow = {
  viewer_key: string;
  window_started_at: string;
  event_count: number;
};

type CommentRow = {
  id: string;
  video_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  likes_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  event_type:
    | 'like'
    | 'comment'
    | 'comment_reply'
    | 'comment_like'
    | 'follow'
    | 'follow_request'
    | 'follow_accepted'
    | 'mention'
    | 'share'
    | 'video_upload_success'
    | 'admin'
    | 'system';
  message: string | null;
  video_id: string | null;
  comment_id: string | null;
  related_user_id: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  reason_code: string;
  target_user_id: string | null;
  target_video_id: string | null;
  target_comment_id: string | null;
  details: string;
  status: 'open' | 'reviewing' | 'actioned' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
};

type UpdateOnly<Row, Writable extends keyof Row> = Partial<Pick<Row, Writable>>;
type ReportTarget =
  | {
      target_user_id: string;
      target_video_id?: null;
      target_comment_id?: null;
    }
  | {
      target_user_id?: null;
      target_video_id: string;
      target_comment_id?: null;
    }
  | {
      target_user_id?: null;
      target_video_id?: null;
      target_comment_id: string;
    };
type ReportInsert = Pick<ReportRow, 'reporter_id' | 'reason_code'> &
  ReportTarget &
  Partial<Pick<ReportRow, 'details'>>;

export type Database = {
  public: {
    Tables: {
      profiles: ReadonlyTable<ProfileRow>;
      role_permissions: ReadonlyTable<{
        role: string;
        permission: string;
      }>;
      videos: Table<
        VideoRow,
        InsertOnly<
          VideoRow,
          | 'user_id'
          | 'title'
          | 'description'
          | 'caption'
          | 'visibility'
          | 'allow_comments'
          | 'allow_remix',
          'user_id'
        >,
        UpdateOnly<
          VideoRow,
          | 'title'
          | 'description'
          | 'caption'
          | 'visibility'
          | 'allow_comments'
          | 'allow_remix'
        >,
        [ForeignKey<'videos_user_id_fkey', 'user_id', 'profiles', 'id'>]
      >;
      video_assets: ReadonlyTable<
        VideoAssetRow,
        [ForeignKey<'video_assets_video_id_fkey', 'video_id', 'videos', 'id'>]
      >;
      video_views: ReadonlyTable<
        VideoViewRow,
        [
          ForeignKey<'video_views_video_id_fkey', 'video_id', 'videos', 'id'>,
          ForeignKey<
            'video_views_viewer_id_fkey',
            'viewer_id',
            'profiles',
            'id'
          >,
        ]
      >;
      creator_analytics_events: ReadonlyTable<CreatorAnalyticsEventRow>;
      creator_analytics_daily: ReadonlyTable<CreatorAnalyticsDailyRow>;
      creator_analytics_playbacks: ReadonlyTable<CreatorAnalyticsPlaybackRow>;
      creator_analytics_sessions: ReadonlyTable<CreatorAnalyticsSessionRow>;
      creator_analytics_viewer_videos: ReadonlyTable<CreatorAnalyticsViewerVideoRow>;
      creator_analytics_rate_limits: ReadonlyTable<CreatorAnalyticsRateLimitRow>;
      likes: ReadonlyTable<
        {
          video_id: string;
          user_id: string;
          created_at: string;
        },
        [
          ForeignKey<'likes_video_id_fkey', 'video_id', 'videos', 'id'>,
          ForeignKey<'likes_user_id_fkey', 'user_id', 'profiles', 'id'>,
        ]
      >;
      comments: Table<
        CommentRow,
        InsertOnly<
          CommentRow,
          'video_id' | 'user_id' | 'parent_comment_id' | 'content',
          'video_id' | 'user_id' | 'content'
        >,
        UpdateOnly<CommentRow, 'deleted_at'>,
        [
          ForeignKey<'comments_video_id_fkey', 'video_id', 'videos', 'id'>,
          ForeignKey<'comments_user_id_fkey', 'user_id', 'profiles', 'id'>,
          CompositeForeignKey<
            'comments_parent_same_video_fk',
            'video_id',
            'parent_comment_id',
            'comments',
            'video_id',
            'id'
          >,
        ]
      >;
      comment_likes: ReadonlyTable<
        {
          comment_id: string;
          user_id: string;
          created_at: string;
        },
        [
          ForeignKey<
            'comment_likes_comment_id_fkey',
            'comment_id',
            'comments',
            'id'
          >,
          ForeignKey<'comment_likes_user_id_fkey', 'user_id', 'profiles', 'id'>,
        ]
      >;
      follows: ReadonlyTable<
        {
          follower_id: string;
          following_id: string;
          status: 'pending' | 'accepted';
          created_at: string;
          updated_at: string;
        },
        [
          ForeignKey<
            'follows_follower_id_fkey',
            'follower_id',
            'profiles',
            'id'
          >,
          ForeignKey<
            'follows_following_id_fkey',
            'following_id',
            'profiles',
            'id'
          >,
        ]
      >;
      bookmarks: ReadonlyTable<
        {
          user_id: string;
          video_id: string;
          created_at: string;
        },
        [
          ForeignKey<'bookmarks_user_id_fkey', 'user_id', 'profiles', 'id'>,
          ForeignKey<'bookmarks_video_id_fkey', 'video_id', 'videos', 'id'>,
        ]
      >;
      hashtags: ReadonlyTable<{
        id: number;
        slug: string;
        created_at: string;
        updated_at: string;
      }>;
      video_hashtags: Table<
        { video_id: string; hashtag_id: number; created_at: string },
        { video_id: string; hashtag_id: number },
        never,
        [
          ForeignKey<
            'video_hashtags_video_id_fkey',
            'video_id',
            'videos',
            'id'
          >,
          ForeignKey<
            'video_hashtags_hashtag_id_fkey',
            'hashtag_id',
            'hashtags',
            'id'
          >,
        ]
      >;
      notifications: Table<
        NotificationRow,
        never,
        UpdateOnly<NotificationRow, 'read_at'>,
        [
          ForeignKey<
            'notifications_recipient_id_fkey',
            'recipient_id',
            'profiles',
            'id'
          >,
          ForeignKey<
            'notifications_actor_id_fkey',
            'actor_id',
            'profiles',
            'id'
          >,
          ForeignKey<'notifications_video_id_fkey', 'video_id', 'videos', 'id'>,
          ForeignKey<
            'notifications_comment_id_fkey',
            'comment_id',
            'comments',
            'id'
          >,
          ForeignKey<
            'notifications_related_user_id_fkey',
            'related_user_id',
            'profiles',
            'id'
          >,
        ]
      >;
      report_reasons: ReadonlyTable<{
        code: string;
        label: string;
        is_active: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }>;
      reports: Table<
        ReportRow,
        ReportInsert,
        never,
        [
          ForeignKey<
            'reports_reporter_id_fkey',
            'reporter_id',
            'profiles',
            'id'
          >,
          ForeignKey<
            'reports_reason_code_fkey',
            'reason_code',
            'report_reasons',
            'code'
          >,
          ForeignKey<
            'reports_target_user_id_fkey',
            'target_user_id',
            'profiles',
            'id'
          >,
          ForeignKey<
            'reports_target_video_id_fkey',
            'target_video_id',
            'videos',
            'id'
          >,
          ForeignKey<
            'reports_target_comment_id_fkey',
            'target_comment_id',
            'comments',
            'id'
          >,
          ForeignKey<
            'reports_reviewed_by_fkey',
            'reviewed_by',
            'profiles',
            'id'
          >,
        ]
      >;
      user_settings: Table<
        {
          user_id: string;
          theme: 'light' | 'dark' | 'system';
          language: string;
          notifications: Json;
          created_at: string;
          updated_at: string;
        },
        InsertOnly<
          {
            user_id: string;
            theme: 'light' | 'dark' | 'system';
            language: string;
            notifications: Json;
            created_at: string;
            updated_at: string;
          },
          'user_id' | 'theme' | 'language' | 'notifications',
          'user_id'
        >,
        UpdateOnly<
          {
            user_id: string;
            theme: 'light' | 'dark' | 'system';
            language: string;
            notifications: Json;
            created_at: string;
            updated_at: string;
          },
          'theme' | 'language' | 'notifications'
        >,
        [
          OneToOneForeignKey<
            'user_settings_user_id_fkey',
            'user_id',
            'profiles',
            'id'
          >,
        ]
      >;
      blocked_users: Table<
        { user_id: string; blocked_user_id: string; created_at: string },
        { user_id: string; blocked_user_id: string },
        never,
        [
          ForeignKey<'blocked_users_user_id_fkey', 'user_id', 'profiles', 'id'>,
          ForeignKey<
            'blocked_users_blocked_user_id_fkey',
            'blocked_user_id',
            'profiles',
            'id'
          >,
        ]
      >;
      saved_searches: Table<
        {
          id: string;
          user_id: string;
          query: string;
          normalized_query: string;
          created_at: string;
          last_used_at: string;
          updated_at: string;
        },
        { user_id: string; query: string },
        UpdateOnly<
          {
            id: string;
            user_id: string;
            query: string;
            normalized_query: string;
            created_at: string;
            last_used_at: string;
            updated_at: string;
          },
          'query' | 'last_used_at'
        >,
        [ForeignKey<'saved_searches_user_id_fkey', 'user_id', 'profiles', 'id'>]
      >;
      search_history: Table<
        { id: number; user_id: string; query: string; searched_at: string },
        { user_id: string; query: string },
        never,
        [ForeignKey<'search_history_user_id_fkey', 'user_id', 'profiles', 'id'>]
      >;
      devices: ReadonlyTable<
        {
          id: string;
          user_id: string;
          client_device_id: string;
          label: string | null;
          device_type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
          browser_family: string | null;
          os_family: string | null;
          last_active_at: string;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        },
        [ForeignKey<'devices_user_id_fkey', 'user_id', 'profiles', 'id'>]
      >;
      audit_logs: ReadonlyTable<
        {
          id: number;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          request_id: string | null;
          metadata: Json;
          created_at: string;
        },
        [ForeignKey<'audit_logs_actor_id_fkey', 'actor_id', 'profiles', 'id'>]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      can_view_video: {
        Args: { target_video_id: string };
        Returns: boolean;
      };
      can_moderate_video: {
        Args: { target_video_id: string };
        Returns: boolean;
      };
      complete_my_onboarding: {
        Args: Record<string, never>;
        Returns: Json;
      };
      create_notification: {
        Args: {
          target_recipient_id: string;
          target_actor_id: string | null;
          target_event_type: NotificationRow['event_type'];
          target_video_id?: string | null;
          target_comment_id?: string | null;
          target_related_user_id?: string | null;
        };
        Returns: string | null;
      };
      delete_my_video: {
        Args: { target_video_id: string };
        Returns: boolean;
      };
      get_creator_dashboard_snapshot: {
        Args: {
          target_creator_id: string;
          range_start: string;
          range_end: string;
        };
        Returns: Json;
      };
      get_public_creator_stats: {
        Args: { target_profile_id: string };
        Returns: {
          followers_count: number;
          following_count: number;
          videos_count: number;
          likes_count: number;
        }[];
      };
      edit_my_comment: {
        Args: { target_comment_id: string; new_content: string };
        Returns: boolean;
      };
      ensure_my_profile: {
        Args: Record<string, never>;
        Returns: Json;
      };
      generate_unique_username: {
        Args: { requested_username: string; excluded_user_id?: string | null };
        Returns: string;
      };
      has_permission: {
        Args: { requested_permission: string };
        Returns: boolean;
      };
      ingest_creator_analytics_events: {
        Args: { p_events: Json };
        Returns: number;
      };
      increment_video_views: {
        Args: {
          target_video_id: string;
          view_event_id: string;
          target_viewer_id?: string | null;
        };
        Returns: number;
      };
      moderate_video: {
        Args: {
          target_video_id: string;
          target_status: 'ready' | 'hidden' | 'deleted';
        };
        Returns: boolean;
      };
      respond_to_follow_request: {
        Args: { requesting_user_id: string; accept_request: boolean };
        Returns: boolean;
      };
      set_profile_access: {
        Args: {
          target_user_id: string;
          target_role: string;
          target_status: string;
          target_is_verified: boolean;
        };
        Returns: Json;
      };
      review_report: {
        Args: {
          target_report_id: string;
          target_status: 'reviewing' | 'actioned' | 'dismissed';
          target_resolution?: string | null;
        };
        Returns: boolean;
      };
      toggle_bookmark: {
        Args: { target_video_id: string };
        Returns: boolean;
      };
      toggle_comment_like: {
        Args: { target_comment_id: string };
        Returns: boolean;
      };
      toggle_follow: {
        Args: { target_user_id: string };
        Returns: string;
      };
      toggle_like: {
        Args: { target_video_id: string };
        Returns: boolean;
      };
      update_my_video_metadata: {
        Args: {
          target_video_id: string;
          new_title: string;
          new_caption: string;
          new_visibility: string;
          new_hashtags: string[];
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type PublicTableName = keyof Database['public']['Tables'];
export type Tables<Name extends PublicTableName> =
  Database['public']['Tables'][Name]['Row'];
export type TablesInsert<Name extends PublicTableName> =
  Database['public']['Tables'][Name]['Insert'];
export type TablesUpdate<Name extends PublicTableName> =
  Database['public']['Tables'][Name]['Update'];
