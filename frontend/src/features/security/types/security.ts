import type { OAuthProvider } from '../../auth/services/oauthService';

export type SecurityEventType =
  | 'user.login'
  | 'user.logout'
  | 'user.password_changed'
  | 'user.email_changed'
  | 'user.profile_updated'
  | 'user.role_changed'
  | 'user.session_refreshed'
  | 'security.login_failed'
  | 'security.rate_limited'
  | 'security.account_restricted';

export type AuditMetadataValue = boolean | number | string | null;

export type SecurityAuditEvent = {
  actorId: string | null;
  occurredAt: string;
  type: SecurityEventType;
  metadata?: Readonly<Record<string, AuditMetadataValue>>;
};

export type AuditLogSink = {
  write(event: SecurityAuditEvent): Promise<void>;
};

export type LoginActivity = {
  actorId: string;
  authenticatedAt: string;
  provider: OAuthProvider | 'email';
  deviceSummary?: string;
  browserSummary?: string;
};

export type LoginActivitySink = {
  recordLogin(activity: LoginActivity): Promise<void>;
  recordLogout(actorId: string, occurredAt: string): Promise<void>;
  recordLastActive(actorId: string, occurredAt: string): Promise<void>;
};

export type SessionRevocationPort = {
  revokeCurrentSession(): Promise<void>;
  revokeAllSessions(): Promise<void>;
};

export type RateLimitPolicy = {
  action: 'login' | 'signup' | 'password-recovery' | 'verification-email';
  maximumAttempts: number;
  windowSeconds: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number | null;
};

export type RateLimitService = {
  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitDecision>;
};

export type SessionValidationResult =
  | { authenticated: true; userId: string }
  | {
      authenticated: false;
      reason: 'missing' | 'invalid' | 'restricted';
      status?: 'suspended' | 'banned';
    };
