'use client';

import {
  Bookmark,
  BarChart3,
  Bell,
  Compass,
  Home,
  MessageCircle,
  Settings,
  Shield,
  ShieldCheck,
  User,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

function TabletNavigation() {
  const pathname = usePathname();
  const navigationItems = useAuthorizedNavigationItems();

  return (
    <div className="hidden border-b border-border bg-canvas/80 px-6 py-2 backdrop-blur-xl md:block lg:hidden">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-6xl gap-1 overflow-x-auto"
      >
        {navigationItems.map(({ icon, label, to }) => {
          const Icon = icons[icon];
          const isActive = isNavigationItemActive(pathname, to);

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill px-3 text-xs font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
              }`}
              href={to}
              key={to}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default TabletNavigation;
