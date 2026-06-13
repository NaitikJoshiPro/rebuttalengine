import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── POST /api/cases/[id]/unclaim ────────────────────────────────────────────
// MANAGER+ can unclaim any case; an ANALYST can unclaim only their own.

export async function POST(_req: NextRequest, { params }: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const roleLevels: Record<string, number> = {
    VIEWER: 1, ANALYST: 2, MANAGER: 3, LEADER: 4, ADMIN: 5,
  };
  const isManager = roleLevels[user.role] >= roleLevels['MANAGER'];

  let updated: Awaited<ReturnType<typeof prisma.case.update>>;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const c = await tx.case.findUnique({ where: { id, orgId: user.orgId } });
      if (!c) throw new Error('NOT_FOUND');
      if (c.status === 'UNCLAIMED') throw new Error('NOT_CLAIMED');

      // ANALYST can only unclaim their own
      if (!isManager && c.claimedById !== user.id) {
        throw new Error('FORBIDDEN');
      }

      return tx.case.update({
        where: { id },
        data: {
          status:      'UNCLAIMED',
          claimedById: null,
          claimedAt:   null,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (err.message === 'NOT_CLAIMED') {
        return NextResponse.json({ error: 'Case is not currently claimed' }, { status: 409 });
      }
      if (err.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: cannot unclaim a case assigned to another analyst' }, { status: 403 });
      }
    }
    console.error('[unclaim] Transaction error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  await writeAuditLog({
    orgId:      user.orgId,
    userId:     user.id,
    caseId:     id,
    action:     'UNCLAIM',
    module:     'CASE',
    entityType: 'Case',
    entityId:   id,
    details:    `Case unclaimed by ${user.name} (${user.email})`,
  });

  return NextResponse.json({ case: updated });
}
