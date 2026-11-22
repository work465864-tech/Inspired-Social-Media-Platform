'use client';

import { Bell, Search } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { paths } from '../../constants/paths.js';
import { NotificationBadge } from './NotificationBadge';
import { SearchBar } from './SearchBar';
import { useUnreadCount } from '../../features/notifications/hooks/useUnreadCount';

export function Navbar() {
  const { count, isError } = useUnreadCount();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            aria-label="Search Connectly"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden dark:hover:bg-white/5"
            href={paths.search}
          >
            <Search aria-hidden="true" className="h-5 w-5" />
          </Link>
          <Link
            aria-label={
              isError
                ? 'Notifications, unread count unavailable'
                : count > 0
                  ? `Notifications, ${count} unread`
                  : 'Notifications'
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/5"
            href={paths.notifications}
          >
            <NotificationBadge count={count}>
              <Bell aria-hidden="true" className="h-5 w-5" />
            </NotificationBadge>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
