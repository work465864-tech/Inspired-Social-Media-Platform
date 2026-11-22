'use client';

import { LoaderCircle } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Profile } from '../features/auth/types/profile';
import type { UpdateProfileInput } from '../features/auth/types/profile';
import {
  AuthContext,
  type AuthContextValue,
} from '../features/auth/context/AuthContext';
import { ProfileOnboardingRedirect } from '../features/auth/components/ProfileOnboardingRedirect';
import { profileUpdateSchema } from '../features/auth/schemas/profileSchemas';
import {
  completeOnboarding as completeProfileOnboarding,
  fetchProfile,
  updateProfile as persistProfile,
} from '../features/auth/services/profileService';
import { createSupabaseBrowserClient } from '../lib/supabase/client';
import { pendingVerificationEmailKey } from '../features/auth/constants/auth';
import { useToast } from './ToastProvider';

type AuthProviderProps = {
  children: ReactNode;
};

const missingProfileMessage =
  'Your profile is not available yet. Please try refreshing it shortly.';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isExpiredSessionError(error: {
  code?: string;
  name?: string;
  status?: number;
}): boolean {
  return (
    error.name === 'AuthSessionMissingError' ||
    error.status === 401 ||
    error.code === 'invalid_grant' ||
    (error.status === 400 && error.code?.startsWith('refresh_token_') === true)
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const showToast = useToast();
  const supabaseRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const sessionRevisionRef = useRef(0);
  const profileCacheRef = useRef(new Map<string, Profile>());
  const profileRequestsRef = useRef(new Map<string, Promise<Profile | null>>());
  const reportedProfileIssueRef = useRef(false);
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthState = useCallback(() => {
    sessionRevisionRef.current += 1;
    activeUserIdRef.current = null;
    profileCacheRef.current.clear();
    profileRequestsRef.current.clear();
    reportedProfileIssueRef.current = false;
    setSession(null);
    setProfile(null);
    setAuthError(null);
    setIsLoading(false);
  }, []);

  const reportProfileIssue = useCallback(
    (error: unknown, userId: string, revision: number) => {
      if (
        sessionRevisionRef.current !== revision ||
        activeUserIdRef.current !== userId
      ) {
        return;
      }

      const message = getErrorMessage(
        error,
        'Unable to load your profile. Please try again.',
      );
      setAuthError(message);
      if (!reportedProfileIssueRef.current) {
        reportedProfileIssueRef.current = true;
        showToast({
          title: 'Profile unavailable',
          description: message,
          variant: 'error',
        });
      }
    },
    [showToast],
  );

  const loadProfile = useCallback(
    async (
      userId: string,
      revision: number,
      forceRefresh = false,
    ): Promise<Profile | null> => {
      const cachedProfile = profileCacheRef.current.get(userId);
      if (!forceRefresh && cachedProfile) {
        return cachedProfile;
      }

      let request = profileRequestsRef.current.get(userId);
      if (!request) {
        request = fetchProfile(userId);
        profileRequestsRef.current.set(userId, request);
      }

      try {
        const nextProfile = await request;
        const isCurrentSession =
          sessionRevisionRef.current === revision &&
          activeUserIdRef.current === userId;

        if (isCurrentSession) {
          if (nextProfile) {
            profileCacheRef.current.set(userId, nextProfile);
          } else {
            profileCacheRef.current.delete(userId);
          }
          setProfile(nextProfile);
          setAuthError(nextProfile ? null : missingProfileMessage);
          if (nextProfile) {
            reportedProfileIssueRef.current = false;
          }
        }

        return nextProfile;
      } finally {
        if (profileRequestsRef.current.get(userId) === request) {
          profileRequestsRef.current.delete(userId);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const profileCache = profileCacheRef.current;
    const profileRequests = profileRequestsRef.current;

    try {
      const supabase = createSupabaseBrowserClient();
      supabaseRef.current = supabase;
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!active) {
          return;
        }

        if (event === 'SIGNED_OUT' || !nextSession) {
          clearAuthState();
          return;
        }

        const userId = nextSession.user.id;
        if (activeUserIdRef.current !== userId) {
          sessionRevisionRef.current += 1;
          activeUserIdRef.current = userId;
          profileCache.clear();
          profileRequests.clear();
          reportedProfileIssueRef.current = false;
          setProfile(null);
          setAuthError(null);
        }

        const revision = sessionRevisionRef.current;
        const cachedProfile = profileCacheRef.current.get(userId) ?? null;
        const shouldRefreshProfile = event === 'USER_UPDATED';
        setSession(nextSession);
        setProfile(cachedProfile);
        if (nextSession) {
          window.sessionStorage.removeItem(pendingVerificationEmailKey);
        }

        if (cachedProfile && !shouldRefreshProfile) {
          setIsLoading(false);
          return;
        }

        setIsLoading(cachedProfile === null);

        window.setTimeout(() => {
          void (async () => {
            try {
              let loadedProfile = await loadProfile(
                userId,
                revision,
                shouldRefreshProfile,
              );
              if (
                !loadedProfile &&
                active &&
                sessionRevisionRef.current === revision &&
                activeUserIdRef.current === userId
              ) {
                await new Promise<void>((resolve) => {
                  window.setTimeout(resolve, 200);
                });
                loadedProfile = await loadProfile(userId, revision, true);
              }

              if (!loadedProfile) {
                throw new Error(missingProfileMessage);
              }
            } catch (error) {
              reportProfileIssue(error, userId, revision);
            } finally {
              if (
                active &&
                sessionRevisionRef.current === revision &&
                activeUserIdRef.current === userId
              ) {
                setIsLoading(false);
              }
            }
          })();
        }, 0);
      });

      return () => {
        active = false;
        subscription.unsubscribe();
        sessionRevisionRef.current += 1;
        activeUserIdRef.current = null;
        profileCache.clear();
        profileRequests.clear();
        supabaseRef.current = null;
      };
    } catch (error) {
      setAuthError(
        getErrorMessage(error, 'Unable to restore the authentication session.'),
      );
      setIsLoading(false);
      showToast({
        title: 'Authentication unavailable',
        description: getErrorMessage(
          error,
          'Unable to restore the authentication session.',
        ),
        variant: 'error',
      });
    }

    return () => {
      active = false;
      sessionRevisionRef.current += 1;
      activeUserIdRef.current = null;
      profileCache.clear();
      profileRequests.clear();
      supabaseRef.current = null;
    };
  }, [clearAuthState, loadProfile, reportProfileIssue, showToast]);

  const refreshProfile = useCallback(async () => {
    const userId = activeUserIdRef.current;
    if (!userId) {
      throw new Error('You must be signed in to refresh your profile.');
    }

    const revision = sessionRevisionRef.current;
    if (!profileCacheRef.current.has(userId)) {
      setIsLoading(true);
    }

    try {
      const nextProfile = await loadProfile(userId, revision, true);
      if (
        sessionRevisionRef.current !== revision ||
        activeUserIdRef.current !== userId
      ) {
        throw new Error('Your session changed while refreshing your profile.');
      }
      if (!nextProfile) {
        throw new Error(missingProfileMessage);
      }
      return nextProfile;
    } catch (error) {
      reportProfileIssue(error, userId, revision);
      throw error;
    } finally {
      if (
        sessionRevisionRef.current === revision &&
        activeUserIdRef.current === userId
      ) {
        setIsLoading(false);
      }
    }
  }, [loadProfile, reportProfileIssue]);

  const refreshSession = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) {
      throw new Error('Authentication is still initializing.');
    }

    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      setAuthError(error.message);
      showToast({
        title: 'Session refresh failed',
        description: error.message,
        variant: 'error',
      });
      if (isExpiredSessionError(error)) {
        const { error: clearError } = await supabase.auth.signOut({
          scope: 'local',
        });
        if (clearError && clearError.name !== 'AuthSessionMissingError') {
          console.error(
            'Unable to clear the expired Supabase session:',
            clearError.message,
          );
        }
        clearAuthState();
      }
      throw error;
    }

    if (!data.session) {
      clearAuthState();
      throw new Error('Supabase did not return an active session.');
    }

    setSession(data.session);
    setAuthError(null);
  }, [clearAuthState, showToast]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      const userId = activeUserIdRef.current;
      if (!userId) {
        throw new Error('You must be signed in to update your profile.');
      }

      const revision = sessionRevisionRef.current;
      const validatedInput = profileUpdateSchema.parse(input);
      const previousProfile = profileCacheRef.current.get(userId) ?? profile;
      if (!previousProfile) {
        throw new Error('Load your profile before editing it.');
      }

      const optimisticProfile: Profile = {
        ...previousProfile,
        ...validatedInput,
        updated_at: new Date().toISOString(),
      };
      profileCacheRef.current.set(userId, optimisticProfile);
      setProfile(optimisticProfile);

      try {
        await persistProfile(userId, validatedInput);
      } catch (error) {
        if (
          sessionRevisionRef.current === revision &&
          activeUserIdRef.current === userId
        ) {
          profileCacheRef.current.set(userId, previousProfile);
          setProfile(previousProfile);
          setAuthError(
            getErrorMessage(error, 'Unable to update your profile.'),
          );
        }
        throw error;
      }

      if (
        sessionRevisionRef.current !== revision ||
        activeUserIdRef.current !== userId
      ) {
        throw new Error('Your session changed while updating your profile.');
      }

      try {
        const updatedProfile = await loadProfile(userId, revision, true);
        if (!updatedProfile) {
          throw new Error(missingProfileMessage);
        }
        return updatedProfile;
      } catch {
        const message =
          'Your changes were saved, but your profile could not be refreshed. Please try refreshing the page.';
        if (
          sessionRevisionRef.current === revision &&
          activeUserIdRef.current === userId
        ) {
          setAuthError(message);
        }
        throw new Error(message);
      }
    },
    [loadProfile, profile],
  );

  const finishOnboarding = useCallback(async () => {
    const userId = activeUserIdRef.current;
    if (!userId) {
      throw new Error('You must be signed in to finish onboarding.');
    }

    const revision = sessionRevisionRef.current;
    const completedProfile = await completeProfileOnboarding(userId);
    if (
      sessionRevisionRef.current !== revision ||
      activeUserIdRef.current !== userId
    ) {
      throw new Error('Your session changed while finishing onboarding.');
    }

    profileCacheRef.current.set(userId, completedProfile);
    setProfile(completedProfile);
    setAuthError(null);
    return completedProfile;
  }, []);

  const logout = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) {
      throw new Error('Authentication is still initializing.');
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    clearAuthState();
  }, [clearAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authError,
      completeOnboarding: finishOnboarding,
      isAuthenticated: Boolean(session?.user),
      isLoading,
      isFirstLogin: Boolean(profile && !profile.onboarding_completed_at),
      isProfileComplete: Boolean(profile?.onboarding_completed_at),
      loading: isLoading,
      logout,
      profile,
      refreshProfile,
      refreshSession,
      session,
      signOut: logout,
      updateProfile,
      user: session?.user ?? null,
    }),
    [
      authError,
      finishOnboarding,
      isLoading,
      logout,
      profile,
      refreshProfile,
      refreshSession,
      session,
      updateProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ProfileOnboardingRedirect />
      {isLoading && (
        <div
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[90] grid place-items-center bg-canvas/75 backdrop-blur-sm"
          role="status"
        >
          <LoaderCircle
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-primary"
          />
          <span className="sr-only">Restoring your session</span>
        </div>
      )}
    </AuthContext.Provider>
  );
}
