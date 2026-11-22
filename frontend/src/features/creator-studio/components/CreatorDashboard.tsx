'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  BarChart3,
  CalendarClock,
  CircleAlert,
  Clock3,
  Eye,
  FileVideo2,
  Heart,
  MessageCircle,
  Share2,
  ShieldCheck,
  Upload,
  UsersRound,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../providers/ToastProvider';
import type { CreatorAnalyticsRange } from '../../creator-analytics/types';
import { useDashboardStats } from '../hooks/useDashboardStats';
import {
  useCreatorVideos,
  useDeleteCreatorVideo,
  useUpdateCreatorVideo,
} from '../hooks/useCreatorVideos';
import type {
  CreatorContentFilters,
  CreatorVideo,
  CreatorVideoEditorInput,
  CreatorVideoStatus,
} from '../types';
import { AnalyticsCard } from './AnalyticsCard';
import { DraftManager } from './DraftManager';
import { EngagementWidget } from './EngagementWidget';
import { RecentUploads } from './RecentUploads';
import { VideoEditor } from './VideoEditor';
import { VideoTable } from './VideoTable';

const PerformanceChart = dynamic(() => import('./PerformanceChart'), {
  ssr: false,
  loading: () => (
    <div
      aria-label="Loading performance chart"
      aria-busy="true"
      className="h-64 animate-pulse rounded-2xl bg-surface-raised"
      role="status"
    />
  ),
});

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'content', label: 'Content', icon: Video },
  { id: 'drafts', label: 'Drafts', icon: FileVideo2 },
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'history', label: 'Upload history', icon: Clock3 },
  { id: 'scheduled', label: 'Scheduled', icon: CalendarClock },
  { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
] as const;

type StudioTab = (typeof tabs)[number]['id'];

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function isStudioTab(value: string | null): value is StudioTab {
  return tabs.some((tab) => tab.id === value);
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-danger/30 bg-danger/5 p-5"
      role="alert"
    >
      <p className="text-sm font-semibold text-foreground">{message}</p>
      <Button className="mt-3" onClick={onRetry} size="sm" variant="outline">
        Try again
      </Button>
    </div>
  );
}

export function CreatorDashboard() {
  const searchParams = useSearchParams();
  const showToast = useToast();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<StudioTab>(
    isStudioTab(initialTab) ? initialTab : 'overview',
  );
  const [range, setRange] = useState<CreatorAnalyticsRange>('30d');
  const [filterState, setFilterState] = useState<CreatorContentFilters>({
    page: 1,
    pageSize: 20,
    query: '',
    status: 'all',
    sort: 'newest',
  });
  const [searchInput, setSearchInput] = useState('');
  const [editingVideo, setEditingVideo] = useState<CreatorVideo | null>(null);
  const summaryQuery = useDashboardStats(range);
  const draftFilters = useMemo<CreatorContentFilters>(
    () => ({
      page: 1,
      pageSize: 20,
      query: '',
      status: 'drafts',
      sort: 'newest',
    }),
    [],
  );
  const videosQuery = useCreatorVideos(filterState);
  const draftsQuery = useCreatorVideos(draftFilters, tab === 'drafts');
  const updateVideo = useUpdateCreatorVideo();
  const deleteVideo = useDeleteCreatorVideo();

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (isStudioTab(requestedTab)) {
      setTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilterState((state) => ({
        ...state,
        page: 1,
        query: searchInput.trim(),
      }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const videos = videosQuery.data?.items ?? [];
  const summary = summaryQuery.data;
  const refetchSummary = summaryQuery.refetch;
  const refetchVideos = videosQuery.refetch;
  const retryAll = useCallback(() => {
    void Promise.all([refetchSummary(), refetchVideos()]);
  }, [refetchSummary, refetchVideos]);

  const updateFilters = useCallback(
    (update: Partial<CreatorContentFilters>) => {
      setFilterState((current) => ({ ...current, ...update }));
    },
    [],
  );

  const saveVideo = useCallback(
    async (videoId: string, input: CreatorVideoEditorInput) => {
      try {
        await updateVideo.mutateAsync({ videoId, input });
        setEditingVideo(null);
        showToast({
          title: 'Video updated',
          description: 'Your changes have been saved.',
          variant: 'success',
        });
      } catch (error) {
        showToast({
          title: 'Could not update video',
          description:
            error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      }
    },
    [showToast, updateVideo],
  );

  const removeVideo = useCallback(
    async (video: CreatorVideo) => {
      if (
        !window.confirm(
          `Delete "${video.title || 'Untitled video'}"? This cannot be undone.`,
        )
      ) {
        return;
      }
      try {
        await deleteVideo.mutateAsync(video.id);
        showToast({
          title: 'Video deleted',
          variant: 'success',
        });
      } catch (error) {
        showToast({
          title: 'Could not delete video',
          description:
            error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      }
    },
    [deleteVideo, showToast],
  );

  const metrics = useMemo(() => {
    if (!summary) {
      return [];
    }
    const { totals, analytics } = summary;
    return [
      {
        label: 'Total videos',
        value: compactNumber.format(totals.videos),
        icon: <Video aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: 'Total views',
        value: compactNumber.format(totals.views),
        icon: <Eye aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: 'Followers',
        value: compactNumber.format(summary.followers),
        icon: <UsersRound aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: 'Following',
        value: compactNumber.format(summary.following),
        icon: <UsersRound aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: 'Likes',
        value: compactNumber.format(totals.likes),
        icon: <Heart aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: 'Comments',
        value: compactNumber.format(totals.comments),
        icon: <MessageCircle aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: `Shares (${range})`,
        value: compactNumber.format(analytics.shares),
        icon: <Share2 aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: `Profile visits (${range})`,
        value: compactNumber.format(analytics.profileVisits),
        icon: <UsersRound aria-hidden="true" className="h-4 w-4" />,
      },
      {
        label: 'Lifetime engagement estimate',
        value: `${summary.engagementRate.toFixed(1)}%`,
        icon: <Activity aria-hidden="true" className="h-4 w-4" />,
      },
    ];
  }, [range, summary]);

  const content = (() => {
    if (
      summaryQuery.isError &&
      !summary &&
      (tab === 'overview' || tab === 'analytics')
    ) {
      return (
        <ErrorState
          message="Creator analytics could not be loaded."
          onRetry={retryAll}
        />
      );
    }

    switch (tab) {
      case 'content':
        return (
          <VideoTable
            videos={videos}
            page={filterState.page}
            totalPages={videosQuery.data?.totalPages ?? 0}
            status={filterState.status}
            sort={filterState.sort}
            query={searchInput}
            isLoading={videosQuery.isLoading}
            onPageChange={(page) => updateFilters({ page })}
            onStatusChange={(status: CreatorVideoStatus) =>
              updateFilters({ page: 1, status })
            }
            onSortChange={(sort) => updateFilters({ page: 1, sort })}
            onQueryChange={setSearchInput}
            onEdit={setEditingVideo}
            onDelete={(video) => void removeVideo(video)}
          />
        );
      case 'drafts':
        if (draftsQuery.isError) {
          return (
            <ErrorState
              message="Drafts and upload history could not be loaded."
              onRetry={() => void draftsQuery.refetch()}
            />
          );
        }
        return (
          <DraftManager
            videos={draftsQuery.data?.items ?? []}
            isLoading={draftsQuery.isLoading}
            onEdit={setEditingVideo}
            onDelete={(video) => void removeVideo(video)}
          />
        );
      case 'analytics':
        return summary ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <AnalyticsCard
                label="Impressions"
                value={compactNumber.format(summary.analytics.impressions)}
                detail={`Last ${range}`}
                icon={<Eye aria-hidden="true" className="h-4 w-4" />}
              />
              <AnalyticsCard
                label="Completion rate"
                value={`${(summary.analytics.completionRate * 100).toFixed(1)}%`}
                detail="Started playbacks watched to the end"
                icon={<Activity aria-hidden="true" className="h-4 w-4" />}
              />
              <AnalyticsCard
                label="View-through rate"
                value={`${(summary.analytics.viewThroughRate * 100).toFixed(1)}%`}
                detail="Average furthest point reached"
                icon={<Eye aria-hidden="true" className="h-4 w-4" />}
              />
            </div>
            <PerformanceChart
              data={summary.series}
              metric="views"
              title="Video starts"
            />
            <PerformanceChart
              data={summary.series}
              metric="watchMs"
              title="Watch time"
            />
            <PerformanceChart
              data={summary.series}
              metric="followers"
              title="Audience growth"
            />
            <EngagementWidget summary={summary} />
          </div>
        ) : (
          <p className="text-sm text-muted">Loading analytics…</p>
        );
      case 'history':
        return (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-foreground">
              Upload history
            </h2>
            <p className="mt-1 text-sm text-muted">
              Recent upload and processing activity.
            </p>
            <ul className="mt-4 divide-y divide-border">
              {videos.map((video) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                  key={video.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {video.title || 'Untitled video'}
                    </p>
                    <p className="mt-1 text-xs capitalize text-muted">
                      {video.status} ·{' '}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(video.createdAt))}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {compactNumber.format(video.views)} views
                  </span>
                </li>
              ))}
            </ul>
            {videos.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">
                No uploads to show yet.
              </p>
            )}
          </section>
        );
      case 'scheduled':
        return (
          <section className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <CalendarClock
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-muted"
            />
            <h2 className="mt-3 text-base font-semibold text-foreground">
              Scheduling is coming soon
            </h2>
            <p className="mt-1 text-sm text-muted">
              Scheduled publishing is reserved for a future release.
            </p>
          </section>
        );
      case 'moderation': {
        const flagged = videos.filter(
          (video) => video.status === 'hidden' || video.status === 'failed',
        );
        return (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-foreground">
              Moderation status
            </h2>
            {flagged.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No videos are awaiting moderation or reporting an upload
                failure.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {flagged.map((video) => (
                  <li
                    className="flex items-center justify-between gap-3 py-3"
                    key={video.id}
                  >
                    <span className="truncate text-sm font-medium text-foreground">
                      {video.title || 'Untitled video'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-warning">
                      <CircleAlert aria-hidden="true" className="h-4 w-4" />
                      {video.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      }
      default:
        return summary ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {metrics.map((metric) => (
                <AnalyticsCard key={metric.label} {...metric} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">
                Performance
              </h2>
              <label className="sr-only" htmlFor="analytics-range">
                Analytics date range
              </label>
              <select
                className="min-h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                id="analytics-range"
                onChange={(event) =>
                  setRange(event.currentTarget.value as CreatorAnalyticsRange)
                }
                value={range}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
            <PerformanceChart
              data={summary.series}
              metric="views"
              title="Video starts"
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <RecentUploads videos={videos} />
              <EngagementWidget summary={summary} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Loading your creator dashboard…</p>
        );
    }
  })();

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Your creator workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Creator Studio
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage content and understand how your audience watches.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          href="/upload"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          Upload video
        </Link>
      </header>

      <nav
        aria-label="Creator Studio modules"
        className="flex gap-2 overflow-x-auto border-b border-border pb-2"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            aria-current={tab === id ? 'page' : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-surface hover:text-foreground'
            }`}
            key={id}
            onClick={() => setTab(id)}
            type="button"
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {(summaryQuery.isLoading || videosQuery.isLoading) && (
        <p aria-live="polite" className="sr-only" role="status">
          Loading creator data.
        </p>
      )}
      {videosQuery.isError && (
        <ErrorState
          message="Creator videos could not be loaded."
          onRetry={() => void videosQuery.refetch()}
        />
      )}
      {content}
      <VideoEditor
        video={editingVideo}
        isSaving={updateVideo.isPending}
        onClose={() => setEditingVideo(null)}
        onSave={saveVideo}
      />
      {deleteVideo.isPending && (
        <p aria-live="polite" className="sr-only" role="status">
          Deleting video.
        </p>
      )}
    </section>
  );
}
