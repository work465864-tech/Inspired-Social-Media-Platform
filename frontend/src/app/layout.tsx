import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '../providers/AuthProvider';
import { QueryProvider } from '../providers/QueryProvider';
import { ToastProvider } from '../providers/ToastProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { RealtimeProvider } from '../providers/RealtimeProvider';
import { MutationProvider } from '../providers/MutationProvider';

export const metadata: Metadata = {
  title: 'Connectly',
  description: 'A thoughtful space to connect and share.',
  icons: {
    icon: '/connectly-mark.svg',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#101016' },
  ],
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <MutationProvider>
              <RealtimeProvider>
                <ToastProvider>
                  <AuthProvider>{children}</AuthProvider>
                </ToastProvider>
              </RealtimeProvider>
            </MutationProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
