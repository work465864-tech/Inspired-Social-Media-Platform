'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Compass, Heart, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AnimatedBackground } from '../../../components/common/AnimatedBackground';
import { Logo } from '../../../components/common/Logo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

type AuthShellProps = {
  children: ReactNode;
};

const highlights = [
  {
    icon: Compass,
    title: 'Find your people',
    description: 'Explore ideas and moments that feel like you.',
  },
  {
    icon: Heart,
    title: 'Make it meaningful',
    description: 'A little closer to the creators you care about.',
  },
];

export default function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
        <aside className="hidden flex-col justify-between px-10 py-10 lg:flex xl:px-16 xl:py-12">
          <div className="flex items-center justify-between">
            <Logo />
            <ThemeToggle />
          </div>

          <div className="auth-brand-stage mx-auto w-full max-w-xl py-12">
            <div className="auth-brand-eyebrow mb-7 inline-flex items-center gap-2 rounded-pill border border-border bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted backdrop-blur-xl">
              <Sparkles
                aria-hidden="true"
                className="h-3.5 w-3.5 text-primary"
              />
              A little more you, every day
            </div>
            <h2 className="auth-brand-title max-w-lg text-foreground">
              Your world,
              <span className="auth-brand-title-accent block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                in good company.
              </span>
            </h2>
            <p className="auth-brand-description mt-6 max-w-md text-muted">
              A thoughtful space for the things you love and the people who get
              them.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {highlights.map(({ description, icon: Icon, title }) => (
                <div
                  className="auth-highlight-card rounded-card border border-border bg-surface/60 p-4 backdrop-blur-xl"
                  key={title}
                >
                  <Icon
                    aria-hidden="true"
                    className="auth-highlight-icon mb-4 h-5 w-5 text-primary"
                  />
                  <p className="auth-highlight-title text-sm font-semibold text-foreground">
                    {title}
                  </p>
                  <p className="auth-highlight-description mt-1 text-xs leading-5 text-muted">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
              className="auth-brand-promo mt-8 flex items-center justify-between rounded-card border border-border bg-surface/70 p-4 shadow-soft backdrop-blur-xl"
              transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
            >
              <div className="flex items-center gap-3">
                <div className="connectly-gradient grid h-10 w-10 place-items-center rounded-control text-foreground">
                  <Sparkles aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Your next favorite corner
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Starts with a hello.
                  </p>
                </div>
              </div>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-muted" />
            </motion.div>
          </div>

          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Connectly. Made for meaningful moments.
          </p>
        </aside>

        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="mb-8 flex w-full max-w-[28rem] items-center justify-between lg:hidden">
            <Logo />
            <ThemeToggle />
          </div>
          <div className="w-full max-w-[28rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                key={pathname}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
            <p className="mt-6 text-center text-xs leading-5 text-muted">
              By continuing, you agree to our{' '}
              <a
                className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href="#terms"
              >
                Terms
              </a>{' '}
              and{' '}
              <a
                className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href="#privacy"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
