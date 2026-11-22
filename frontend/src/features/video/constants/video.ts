import type { VideoAccent } from '../types/video';

export const videoAccentClasses: Record<
  VideoAccent,
  { backdrop: string; glow: string }
> = {
  violet: {
    backdrop: 'from-violet-300/45 via-slate-400/25 to-slate-800/80',
    glow: 'bg-violet-300/35',
  },
  teal: {
    backdrop: 'from-teal-200/40 via-slate-400/25 to-slate-800/80',
    glow: 'bg-teal-200/30',
  },
  coral: {
    backdrop: 'from-rose-200/40 via-slate-400/25 to-slate-800/80',
    glow: 'bg-rose-200/30',
  },
};

export const defaultVideoLocation = 'Somewhere inspiring';
