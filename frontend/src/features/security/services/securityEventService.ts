import type {
  AuditLogSink,
  LoginActivity,
  LoginActivitySink,
  SecurityAuditEvent,
  SecurityEventType,
} from '../types/security';

const maximumMetadataLength = 256;
const sensitiveMetadataKeys =
  /password|token|secret|authorization|cookie|email|ip|user.?agent/i;
const userIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUserId(userId: string): void {
  if (!userIdPattern.test(userId)) {
    throw new Error('Security activity requires a valid user ID.');
  }
}

function sanitizeMetadata(
  metadata: SecurityAuditEvent['metadata'],
): SecurityAuditEvent['metadata'] {
  if (!metadata) {
    return undefined;
  }

  const safeEntries = Object.entries(metadata)
    .filter(([key]) => !sensitiveMetadataKeys.test(key))
    .map(
      ([key, value]) =>
        [
          key.slice(0, 64),
          typeof value === 'string'
            ? value.slice(0, maximumMetadataLength)
            : value,
        ] as const,
    );

  return Object.fromEntries(safeEntries);
}

export class SecurityEventService {
  private readonly auditSink: AuditLogSink;
  private readonly activitySink: LoginActivitySink;

  constructor(auditSink: AuditLogSink, activitySink: LoginActivitySink) {
    this.auditSink = auditSink;
    this.activitySink = activitySink;
  }

  async record(
    type: SecurityEventType,
    actorId: string | null,
    metadata?: SecurityAuditEvent['metadata'],
  ): Promise<void> {
    if (actorId !== null) {
      assertUserId(actorId);
    }

    await this.auditSink.write({
      actorId,
      occurredAt: new Date().toISOString(),
      type,
      metadata: sanitizeMetadata(metadata),
    });
  }

  async recordLogin(activity: LoginActivity): Promise<void> {
    assertUserId(activity.actorId);
    await this.activitySink.recordLogin({
      ...activity,
      deviceSummary: activity.deviceSummary?.slice(0, maximumMetadataLength),
      browserSummary: activity.browserSummary?.slice(0, maximumMetadataLength),
    });
  }

  async recordLogout(actorId: string): Promise<void> {
    assertUserId(actorId);
    await this.activitySink.recordLogout(actorId, new Date().toISOString());
  }

  async recordLastActive(actorId: string): Promise<void> {
    assertUserId(actorId);
    await this.activitySink.recordLastActive(actorId, new Date().toISOString());
  }
}
