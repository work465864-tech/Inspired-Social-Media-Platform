import type { Session, User } from '@supabase/supabase-js';
import { createContext } from 'react';
import type { Profile, UpdateProfileInput } from '../types/profile';

export type AuthContextValue = {
  authError: string | null;
  completeOnboarding: () => Promise<Profile>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  isProfileComplete: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile>;
  refreshSession: () => Promise<void>;
  session: Session | null;
  signOut: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<Profile>;
  user: User | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
