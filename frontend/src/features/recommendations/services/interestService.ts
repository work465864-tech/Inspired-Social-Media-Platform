import { recommendationCache } from './recommendationCache';
import type { InterestProfile } from '../types';

const maxPreferenceCount = 50;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizePreferences(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  ].slice(0, maxPreferenceCount);
}

function getLanguagePreference(): string | null {
  return typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : null;
}

export class InterestService {
  async getProfile(
    userId: string,
    signal: AbortSignal,
  ): Promise<InterestProfile> {
    if (!uuidPattern.test(userId)) {
      throw new Error(
        'A valid user is required to load recommendation interests.',
      );
    }
    if (signal.aborted) {
      throw signal.reason ?? new Error('The interest request was cancelled.');
    }

    const cached = recommendationCache.getInterestProfile(userId);
    if (cached) {
      return cached;
    }

    const profile: InterestProfile = {
      userId,
      isColdStart: true,
      interests: [],
      preferredCategories: [],
      languagePreference: getLanguagePreference(),
      regionPreference: null,
      updatedAt: new Date().toISOString(),
    };
    recommendationCache.setInterestProfile(profile);
    return profile;
  }

  setProfile(
    profile: Omit<InterestProfile, 'updatedAt'> & { updatedAt?: string },
  ): InterestProfile {
    if (!uuidPattern.test(profile.userId)) {
      throw new Error(
        'A valid user is required to update recommendation interests.',
      );
    }

    const normalized: InterestProfile = {
      ...profile,
      interests: normalizePreferences(profile.interests),
      preferredCategories: normalizePreferences(profile.preferredCategories),
      updatedAt: profile.updatedAt ?? new Date().toISOString(),
    };
    recommendationCache.setInterestProfile(normalized);
    return normalized;
  }
}

export const interestService = new InterestService();
