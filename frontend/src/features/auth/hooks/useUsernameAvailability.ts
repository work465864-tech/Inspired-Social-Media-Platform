'use client';

import { useEffect, useState } from 'react';
import { profileUsernameSchema } from '../schemas/profileSchemas';
import { checkUsernameAvailability } from '../services/profileService';

type UsernameStatus = 'available' | 'checking' | 'error' | 'idle' | 'taken';

type UsernameAvailabilityState = {
  error: string | null;
  status: UsernameStatus;
  suggestions: string[];
};

const idleState: UsernameAvailabilityState = {
  error: null,
  status: 'idle',
  suggestions: [],
};

export function useUsernameAvailability(
  username: string,
  currentUserId?: string,
) {
  const [state, setState] = useState(idleState);
  const [retryNumber, setRetryNumber] = useState(0);

  useEffect(() => {
    const parsedUsername = profileUsernameSchema.safeParse(username);
    if (!parsedUsername.success) {
      setState(idleState);
      return;
    }

    let active = true;
    setState({ ...idleState, status: 'checking' });
    const timeout = window.setTimeout(() => {
      void checkUsernameAvailability(parsedUsername.data, currentUserId).then(
        (result) => {
          if (active) {
            setState({
              error: null,
              status: result.available ? 'available' : 'taken',
              suggestions: result.suggestions,
            });
          }
        },
        (error: unknown) => {
          if (active) {
            setState({
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to check username availability.',
              status: 'error',
              suggestions: [],
            });
          }
        },
      );
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [currentUserId, retryNumber, username]);

  return {
    ...state,
    retry: () => setRetryNumber((current) => current + 1),
  };
}
