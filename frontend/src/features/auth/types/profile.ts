import type { UserRole, UserStatus } from '../../rbac/types/rbac';

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  role: UserRole;
  status: UserStatus;
  is_verified: boolean;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  onboarding_completed_at: string | null;
};

export type UpdateProfileInput = Pick<
  Profile,
  'username' | 'full_name' | 'avatar_url' | 'bio' | 'is_private'
>;
