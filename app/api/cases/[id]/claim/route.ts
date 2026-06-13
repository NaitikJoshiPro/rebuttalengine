import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── POST /api/cases/[id]/claim ───────────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Must be at least ANALYST to claim
  const roleLevels: Record<string, number> = {
    VIEWER: 1, ANALYST: 2, MANAGER: 3, LEADER: 4, ADMIN: 5,
  };
  if (roleLevels[user.role] < roleLevels['ANALYST']) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let updated: Awaited<ReturnType<typeof prisma.case.update>>;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const c = await tx.case.findUnique({ where: { id, orgId: user.orgId } });
      if (!c) throw new Error('NOT_FOUND');
      if (c.status !== 'UNCLAIMED') throw new Error('ALREADY_CLAIMED');
      return tx.case.update({
        where: { id },
        data: {
          status:      'PENDING',
          claimedById: user.id,
          claimedAt:   new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (err.message === 'ALREADY_CLAIMED') {
        return NextResponse.json({ error: 'Case is already claimed' }, { status: 409 });
      }
    }
    console.error('[claim] Transaction error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  await writeAuditLog({
    orgId:      user.orgId,
    userId:     user.id,
    caseId:     id,
    action:     'CLAIM',
    module:     'CASE',
    entityType: 'Case',
    entityId:   id,
    details:    `Case claimed by ${user.name} (${user.email})`,
  });

  return NextResponse.json({ case: updated });
}
