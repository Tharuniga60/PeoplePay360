import { db } from '@/db';
import { auditLogs } from '@/db/schema';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXECUTE_PAYRUN'
  | 'APPROVE'
  | 'LOCK';

export interface AuditEventInput {
  companyId: string;
  actorId: string;
  entityName: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────────
// LOG AUDIT EVENT
// Persists an immutable audit trail entry to audit_logs
// ─────────────────────────────────────────────

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      companyId: input.companyId,
      actorId: input.actorId,
      entityName: input.entityName,
      entityId: input.entityId,
      action: input.action,
      changes: input.changes ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    // Audit logging should never break the primary operation
    console.error('[AuditLog] Failed to write audit event:', err);
  }
}
