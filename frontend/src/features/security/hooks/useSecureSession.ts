'use client';

import { useCallback, useState } from 'react';
import type { SessionValidationResult } from '../types/security';
import { validateBrowserSession } from '../services/sessionValidationService';

export function useSecureSession() {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<SessionValidationResult | null>(null);

  const validate = useCallback(async () => {
    setIsValidating(true);
    try {
      const validationResult = await validateBrowserSession();
      setResult(validationResult);
      return validationResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { isValidating, result, validate };
}
