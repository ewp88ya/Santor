import { createAuditLog } from './audit.repository.js';

export async function auditLog(data: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    return await createAuditLog(data);
  } catch (error) {
    console.error('[AUDIT] Failed to create audit log:', error);
    return null;
  }
}
