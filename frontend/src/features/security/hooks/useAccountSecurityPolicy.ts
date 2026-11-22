'use client';

import { getAccountSecurityPolicy } from '../services/accountSecurityPolicy';

const accountSecurityPolicy = getAccountSecurityPolicy();

export function useAccountSecurityPolicy() {
  return accountSecurityPolicy;
}
