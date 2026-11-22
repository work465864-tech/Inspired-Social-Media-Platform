export type AccountSecurityPolicy = {
  requireVerifiedEmail: boolean;
};

export function getAccountSecurityPolicy(): AccountSecurityPolicy {
  return {
    requireVerifiedEmail:
      process.env.NEXT_PUBLIC_REQUIRE_VERIFIED_EMAIL === 'true',
  };
}
