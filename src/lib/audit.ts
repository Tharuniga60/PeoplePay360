import { db } from '@/db';
import { auditLogs, type auditActionEnum } from '@/db/schema';

export type AuditAction = (typeof auditActionEnum.enumValues)[number];

export interface AuditEventParams {
  companyId: string;
  actorId: string;
  entityName: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Persist an audit event asynchronously without blocking the user response.
 */
export async function recordAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      companyId: params.companyId,
      actorId: params.actorId,
      entityName: params.entityName,
      entityId: params.entityId,
      action: params.action,
      changes: params.changes ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch (error) {
    console.error('[AUDIT LOG ERROR] Failed to record audit event:', error);
  }
}

export const logAuditEvent = recordAuditEvent;

