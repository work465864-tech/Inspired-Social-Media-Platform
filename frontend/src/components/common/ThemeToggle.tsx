'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '../../lib/utils';

const themeModes = ['system', 'light', 'dark'] as const;
type ThemeMode = (typeof themeModes)[number];

const themeLabels: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme as ThemeMode) : 'system';
  const currentIndex = themeModes.indexOf(currentTheme);
  const nextTheme = themeModes[(currentIndex + 1) % themeModes.length];
  const ThemeIcon =
    currentTheme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <button
      aria-label={`Current theme: ${themeLabels[currentTheme]}. Switch to ${themeLabels[nextTheme]} theme.`}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/80 text-muted transition-colors duration-fast hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/5',
        !mounted && 'cursor-wait',
      )}
      disabled={!mounted}
      onClick={() => setTheme(nextTheme)}
      title={`Theme: ${themeLabels[currentTheme]}`}
      type="button"
    >
      <ThemeIcon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}
