import type { ReactNode } from 'react';
import { AuthGuard } from '../../features/auth/components/RouteGuards';
import AppLayout from '../../layouts/AppLayout';

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}
