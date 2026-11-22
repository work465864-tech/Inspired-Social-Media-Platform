'use client';

import { useCan } from './useCan';

export function useIsAdmin(): boolean {
  return useCan('admin:access');
}
