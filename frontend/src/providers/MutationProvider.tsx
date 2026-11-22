'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MutationService } from '../features/mutations/services/mutationService';

type MutationLayerValue = {
  service: MutationService;
};

const MutationLayerContext = createContext<MutationLayerValue | null>(null);

type MutationProviderProps = {
  children: ReactNode;
};

export function MutationProvider({ children }: MutationProviderProps) {
  const queryClient = useQueryClient();
  const [service] = useState(() => new MutationService(queryClient));

  useEffect(() => {
    service.start();
    return () => service.dispose();
  }, [service]);

  return (
    <MutationLayerContext.Provider value={{ service }}>
      {children}
    </MutationLayerContext.Provider>
  );
}

export function useMutationLayer(): MutationLayerValue {
  const context = useContext(MutationLayerContext);
  if (!context) {
    throw new Error('Mutation hooks must be used within MutationProvider.');
  }
  return context;
}
