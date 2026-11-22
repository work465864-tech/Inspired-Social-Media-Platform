import type {
  RateLimitDecision,
  RateLimitPolicy,
  RateLimitService,
} from '../types/security';

export async function assertRateLimit(
  service: RateLimitService,
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitDecision> {
  if (!key.trim()) {
    throw new Error('A rate-limit identity is required.');
  }
  if (
    !Number.isSafeInteger(policy.maximumAttempts) ||
    policy.maximumAttempts < 1 ||
    !Number.isSafeInteger(policy.windowSeconds) ||
    policy.windowSeconds < 1
  ) {
    throw new Error('The rate-limit policy is invalid.');
  }

  const decision = await service.consume(key, policy);
  if (
    typeof decision.allowed !== 'boolean' ||
    (decision.retryAfterSeconds !== null &&
      (!Number.isSafeInteger(decision.retryAfterSeconds) ||
        decision.retryAfterSeconds < 0))
  ) {
    throw new Error('The rate-limit service returned an invalid decision.');
  }

  return decision;
}
