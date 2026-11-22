'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '../lib/supabase/client';
import { RealtimeService } from '../features/realtime/services/realtimeService';
import type { RealtimeConnectionSnapshot } from '../features/realtime/types/connection';

type RealtimeContextValue = {
  service: RealtimeService | null;
  connection: RealtimeConnectionSnapshot;
  ready: boolean;
  initializationError: string | null;
};

const initialConnection: RealtimeConnectionSnapshot = {
  status: 'disconnected',
  isOnline: true,
  activeChannels: 0,
  channels: {},
  lastError: null,
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function getConnectionAnnouncement(
  connection: RealtimeConnectionSnapshot,
  initializationError: string | null,
): string {
  if (initializationError) {
    return 'Live updates are unavailable.';
  }
  switch (connection.status) {
    case 'connected':
      return 'Live updates connected.';
    case 'connecting':
      return 'Connecting to live updates.';
    case 'reconnecting':
      return 'Reconnecting live updates.';
    case 'offline':
      return 'You are offline. Live updates will reconnect when you are online.';
    case 'error':
      return 'Live updates encountered an error.';
    default:
      return 'Live updates are disconnected.';
  }
}

type RealtimeProviderProps = {
  children: ReactNode;
};

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const [service, setService] = useState<RealtimeService | null>(null);
  const [connection, setConnection] =
    useState<RealtimeConnectionSnapshot>(initialConnection);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    let realtime: RealtimeService;
    try {
      realtime = new RealtimeService(
        createSupabaseBrowserClient(),
        queryClient,
      );
      realtime.start();
      const unsubscribe = realtime.connection.subscribe((snapshot) => {
        if (active) {
          setConnection(snapshot);
        }
      });
      setService(realtime);
      setInitializationError(null);
      return () => {
        active = false;
        unsubscribe();
        realtime.dispose();
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'The realtime service could not be initialized.';
      setInitializationError(message);
      setConnection({
        ...initialConnection,
        status: 'error',
        lastError: {
          kind: 'unexpected',
          message,
          occurredAt: Date.now(),
        },
      });
      return () => {
        active = false;
      };
    }
  }, [queryClient]);

  const value: RealtimeContextValue = {
    service,
    connection,
    ready: service !== null,
    initializationError,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <p aria-live="polite" className="sr-only" role="status">
        {getConnectionAnnouncement(connection, initializationError)}
      </p>
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('Realtime hooks must be used within RealtimeProvider.');
  }
  return context;
}
