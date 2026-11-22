'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './useAuth';

export function useRequireAuth() {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading || auth.isAuthenticated) {
      return;
    }

    const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
    router.replace(loginUrl);
  }, [auth.isAuthenticated, auth.isLoading, pathname, router]);

  return auth;
}
