'use client';

import {
  Compass,
  BarChart3,
  Home,
  MessageCircle,
  Plus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { paths } from '../../constants/paths.js';
import { isNavigationItemActive } from '../../utils/navigation';

const navigationItems: Array<{
  label: string;
  to: string;
  icon: LucideIcon;
  prominent?: boolean;
}> = [
  { label: 'Home', to: paths.home, icon: Home },
  { label: 'Explore', to: paths.explore, icon: Compass },
  { label: 'Studio', to: paths.creatorStudio, icon: BarChart3 },
  { label: 'Upload', to: paths.upload, icon: Plus, prominent: true },
  { label: 'Inbox', to: paths.messages, icon: MessageCircle },
  { label: 'Profile', to: paths.profile, icon: UserRound },
];

function MobileBottomNavigation() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-surface/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgb(0_0_0/0.08)] backdrop-blur-xl md:hidden"
    >
      {navigationItems.map(({ icon: Icon, label, to, prominent }) => {
        const isActive = isNavigationItemActive(pathname, to);

        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-control text-[0.6875rem] font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive || prominent ? 'text-primary' : 'text-muted'
            }`}
            href={to}
            key={to}
          >
            {isActive && !prominent && (
              <motion.span
                aria-hidden="true"
                className="absolute top-0 h-0.5 w-7 rounded-full bg-primary"
                layoutId="mobile-navigation-indicator"
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.18,
                }}
              />
            )}
            <span
              className={`grid h-7 w-10 place-items-center ${
                prominent
                  ? 'rounded-full bg-primary text-primary-foreground shadow-glow'
                  : ''
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="max-w-full truncate px-0.5 text-center">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNavigation;
