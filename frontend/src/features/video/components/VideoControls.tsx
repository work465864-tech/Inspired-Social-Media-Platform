'use client';

import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { memo, type ChangeEvent, type MouseEvent } from 'react';
import { cn } from '../../../lib/utils';
import type { VideoPlayerState } from '../types/player';
import type { VideoControlsApi } from '../hooks/useVideoControls';
import { formatVideoTime } from '../services/videoPlayback';

export const VideoTime = memo(function VideoTime({
  currentTime,
  duration,
}: {
  currentTime: number;
  duration: number;
}) {
  return (
    <span
      aria-label={`${formatVideoTime(currentTime)} of ${formatVideoTime(duration)}`}
      className="shrink-0 text-[0.6875rem] font-medium tabular-nums text-white/85"
    >
      {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
    </span>
  );
});

export const VideoProgress = memo(function VideoProgress({
  buffered,
  currentTime,
  duration,
  onSeek,
}: {
  buffered: number;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const stopPropagation = (event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(event.currentTarget.value));
  };

  return (
    <div className="relative flex min-w-12 flex-1 items-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/25"
      >
        <span
          className="block h-full rounded-full bg-white/50"
          style={{ width: `${buffered}%` }}
        />
      </div>
      <input
        aria-label="Video progress"
        aria-valuetext={`${formatVideoTime(currentTime)} of ${formatVideoTime(duration)}`}
        className="relative z-10 h-5 w-full cursor-pointer appearance-none bg-transparent accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 disabled:cursor-not-allowed"
        disabled={duration <= 0}
        max={Math.max(duration, 0)}
        min={0}
        onChange={onChange}
        onClick={stopPropagation}
        step={0.1}
        type="range"
        value={Math.min(currentTime, Math.max(duration, 0))}
      />
    </div>
  );
});

export const VolumeControl = memo(function VolumeControl({
  muted,
  onSetVolume,
  onToggleMute,
  volume,
}: {
  muted: boolean;
  onSetVolume: (volume: number) => void;
  onToggleMute: () => void;
  volume: number;
}) {
  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-1">
      <button
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
        onClick={(event) => {
          event.stopPropagation();
          onToggleMute();
        }}
        type="button"
      >
        <VolumeIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <input
        aria-label="Volume"
        className="hidden h-5 w-16 cursor-pointer accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:block"
        max={1}
        min={0}
        onChange={(event) => onSetVolume(Number(event.currentTarget.value))}
        onClick={(event) => event.stopPropagation()}
        step={0.05}
        type="range"
        value={muted ? 0 : volume}
      />
    </div>
  );
});

export const FullscreenButton = memo(function FullscreenButton({
  fullscreen,
  onToggle,
}: {
  fullscreen: boolean;
  onToggle: () => void;
}) {
  const Icon = fullscreen ? Minimize : Maximize;

  return (
    <button
      aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      className="grid h-9 w-9 place-items-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      type="button"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
});

export const ReplayButton = memo(function ReplayButton({
  onReplay,
}: {
  onReplay: () => void;
}) {
  return (
    <button
      aria-label="Replay video"
      className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
      onClick={(event) => {
        event.stopPropagation();
        onReplay();
      }}
      type="button"
    >
      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
      Replay
    </button>
  );
});

export const VideoControls = memo(function VideoControls({
  controls,
  showReplayButton = false,
  state,
}: {
  controls: VideoControlsApi;
  showReplayButton?: boolean;
  state: VideoPlayerState;
}) {
  const isPlaying = state.status === 'playing' || state.status === 'buffering';
  const PlayIcon = isPlaying ? Pause : Play;

  return (
    <div
      aria-label="Playback controls"
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4',
      )}
      onClick={(event) => event.stopPropagation()}
      role="group"
    >
      <div className="flex items-center gap-2">
        <button
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          onClick={controls.togglePlayback}
          type="button"
        >
          <PlayIcon
            aria-hidden="true"
            className={isPlaying ? 'h-4 w-4' : 'ml-0.5 h-4 w-4 fill-current'}
          />
        </button>
        <VideoTime currentTime={state.currentTime} duration={state.duration} />
        <VideoProgress
          buffered={state.buffered}
          currentTime={state.currentTime}
          duration={state.duration}
          onSeek={controls.seekTo}
        />
        {(state.status === 'ended' || showReplayButton) && (
          <ReplayButton onReplay={controls.replay} />
        )}
        <VolumeControl
          muted={state.muted}
          onSetVolume={controls.setVolume}
          onToggleMute={controls.toggleMute}
          volume={state.volume}
        />
        <FullscreenButton
          fullscreen={state.fullscreen}
          onToggle={controls.toggleFullscreen}
        />
      </div>
    </div>
  );
});
