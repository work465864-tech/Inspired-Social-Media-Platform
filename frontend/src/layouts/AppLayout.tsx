import type { ReactNode } from 'react';
import {
  DesktopSidebar,
  MobileBottomNavigation,
  TabletNavigation,
} from '../components/navigation/index.js';
import {
  ContentContainer,
  FloatingActionButton,
  Navbar,
  PageContainer,
  PageTransition,
  RightSidebar,
} from '../components/shell';
import DesktopLayout from './DesktopLayout.jsx';
import MobileLayout from './MobileLayout.jsx';
import TabletLayout from './TabletLayout.jsx';
import { NotificationRealtimeListener } from '../features/notifications/components/NotificationRealtimeListener';
import { RealtimeSyncListener } from '../features/realtime/components/RealtimeSyncListener';

type AppLayoutProps = {
  children: ReactNode;
};

function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <a
        className="sr-only z-50 rounded-control bg-surface px-4 py-3 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-primary"
        href="#main-content"
      >
        Skip to content
      </a>
      <DesktopLayout>
        <DesktopSidebar />
      </DesktopLayout>
      <div className="min-h-screen lg:pl-sidebar">
        <Navbar />
        <TabletLayout>
          <TabletNavigation />
        </TabletLayout>
        <ContentContainer>
          <main
            aria-label="Page content"
            className="min-h-[calc(100vh-4rem)] min-w-0"
            id="main-content"
            tabIndex={-1}
          >
            <PageContainer>
              <PageTransition>{children}</PageTransition>
            </PageContainer>
          </main>
          <RightSidebar />
        </ContentContainer>
      </div>
      <MobileLayout>
        <MobileBottomNavigation />
      </MobileLayout>
      <FloatingActionButton />
      <NotificationRealtimeListener />
      <RealtimeSyncListener />
    </div>
  );
}

export default AppLayout;
