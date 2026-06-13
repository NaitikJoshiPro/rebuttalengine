import prisma from '@/lib/prisma';
import type { AuditAction } from '@prisma/client';

export async function writeAuditLog(params: {
  orgId: string;
  userId?: string;
  caseId?: string;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: params.orgId,
        userId: params.userId,
        caseId: params.caseId,
        action: params.action,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
        previousValue: params.previousValue,
        newValue: params.newValue,
      },
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
