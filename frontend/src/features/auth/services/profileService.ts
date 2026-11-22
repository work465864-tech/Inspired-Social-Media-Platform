import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { assertPermission } from '../../rbac/services/permissionService';
import {
  profileUpdateSchema,
  profileUsernameSchema,
} from '../schemas/profileSchemas';
import type { Profile, UpdateProfileInput } from '../types/profile';

export type UsernameAvailability = {
  available: boolean;
  suggestions: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProfile(value: unknown): value is Profile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.username === 'string' &&
    typeof value.full_name === 'string' &&
    (typeof value.avatar_url === 'string' || value.avatar_url === null) &&
    typeof value.bio === 'string' &&
    typeof value.role === 'string' &&
    typeof value.status === 'string' &&
    typeof value.is_verified === 'boolean' &&
    typeof value.is_private === 'boolean' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string' &&
    (typeof value.onboarding_completed_at === 'string' ||
      value.onboarding_completed_at === null)
  );
}

function parseProfile(value: unknown, userId: string): Profile {
  if (!isProfile(value)) {
    throw new Error('The profile response has an unexpected shape.');
  }
  if (value.id !== userId) {
    throw new Error('The profile response does not match the active user.');
  }

  return value;
}

async function syncAuthMetadata(profile: Profile): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }
  if (!session || session.user.id !== profile.id) {
    throw new Error('The profile does not match the active session.');
  }
  if (profile.status !== 'active') {
    return;
  }

  const metadata = isRecord(session.user.user_metadata)
    ? session.user.user_metadata
    : {};
  const matchesProfile =
    metadata.username === profile.username &&
    metadata.full_name === profile.full_name &&
    metadata.avatar_url === profile.avatar_url &&
    metadata.bio === profile.bio &&
    metadata.is_private === profile.is_private;

  if (!matchesProfile) {
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: {
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_private: profile.is_private,
      },
    });

    if (updateError) {
      throw updateError;
    }
    if (data.user?.id !== profile.id) {
      throw new Error('Supabase did not return the synchronized user.');
    }
  }
}

function createUsernameSuggestions(username: string): string[] {
  return [2, 7, 24].map((suffix) => {
    const suffixText = `_${suffix}`;
    return `${username.slice(0, 24 - suffixText.length)}${suffixText}`;
  });
}

export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string,
): Promise<UsernameAvailability> {
  const parsedUsername = profileUsernameSchema.safeParse(username);
  if (!parsedUsername.success) {
    return { available: false, suggestions: [] };
  }

  const normalizedUsername = parsedUsername.data;
  const suggestions = createUsernameSuggestions(normalizedUsername);
  const candidates = [normalizedUsername, ...suggestions];
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', candidates);

  if (error) {
    throw error;
  }

  const occupiedUsernames = new Set<string>();
  const rows: unknown = data;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (
        isRecord(row) &&
        typeof row.username === 'string' &&
        typeof row.id === 'string' &&
        row.id !== currentUserId
      ) {
        occupiedUsernames.add(row.username);
      }
    }
  }

  return {
    available: !occupiedUsernames.has(normalizedUsername),
    suggestions: suggestions.filter(
      (suggestion) => !occupiedUsernames.has(suggestion),
    ),
  };
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('ensure_my_profile');

  if (error) {
    throw error;
  }

  const profile = parseProfile(data, userId);
  await syncAuthMetadata(profile);
  return profile;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<void> {
  const profileInput = profileUpdateSchema.parse(input);
  await assertPermission('profiles:update:own');
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.updateUser({
    data: profileInput,
  });

  if (error) {
    throw error;
  }
  if (data.user?.id !== userId) {
    throw new Error('Supabase did not update the active user profile.');
  }
}

export async function completeOnboarding(userId: string): Promise<Profile> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('complete_my_onboarding');

  if (error) {
    throw error;
  }

  return parseProfile(data, userId);
}
