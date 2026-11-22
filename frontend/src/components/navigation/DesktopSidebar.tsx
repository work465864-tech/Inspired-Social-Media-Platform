'use client';

import {
  Bookmark,
  BarChart3,
  Bell,
  Compass,
  Home,
  MessageCircle,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  User,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../common/Logo';
import { paths } from '../../constants/paths.js';
import { useAuthorizedNavigationItems } from '../../features/rbac/hooks/useAuthorizedNavigationItems';
import { isNavigationItemActive } from '../../utils/navigation';

const icons: Record<string, LucideIcon> = {
  home: Home,
  explore: Compass,
  following: UsersRound,
  notifications: Bell,
  messages: MessageCircle,
  bookmarks: Bookmark,
  creatorStudio: BarChart3,
  profile: User,
  settings: Settings,
  moderation: Shield,
  admin: ShieldCheck,
};

function DesktopSidebar() {
  const pathname = usePathname();
  const navigationItems = useAuthorizedNavigationItems();
  const primaryItems = navigationItems.filter(
    ({ to }) => to !== '/moderation' && to !== '/admin',
  );
  const roleItems = navigationItems.filter(
    ({ to }) => to === '/moderation' || to === '/admin',
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col border-r border-border bg-canvas px-5 py-7 lg:flex">
      <Logo className="px-2" />
      <nav aria-label="Main navigation" className="mt-10 flex-1">
        <div className="grid gap-1">
          {primaryItems.map(({ icon, label, to }) => {
            const Icon = icons[icon];
            const isActive = isNavigationItemActive(pathname, to);

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`group flex min-h-12 items-center gap-3 rounded-control px-4 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
                }`}
                href={to}
                key={to}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
        {roleItems.length > 0 && (
          <div className="mt-4 grid gap-1 border-t border-border pt-4">
            {roleItems.map(({ icon, label, to }) => {
              const Icon = icons[icon];
              const isActive = isNavigationItemActive(pathname, to);

              return (
                <Link
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-control px-4 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
                  }`}
                  href={to}
                  key={to}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
      <Link
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform duration-fast hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
        href={paths.upload}
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
        Create
      </Link>
    </aside>
  );
}

export default DesktopSidebar;
