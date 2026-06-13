import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── Zod schema for PATCH ─────────────────────────────────────────────────────

const patchCaseSchema = z.object({
  portal:             z.string().optional(),
  currency:           z.string().optional(),
  mop:                z.string().optional(),
  dueDate:            z.string().optional().nullable(),
  disputeAmount:      z.number().positive().optional(),
  transactionAmount:  z.number().positive().optional().nullable(),
  refundAmount:       z.number().nonnegative().optional().nullable(),
  taxAmount:          z.number().nonnegative().optional().nullable(),
  serviceFeeAmount:   z.number().nonnegative().optional().nullable(),
  status:             z.enum(['UNCLAIMED','PENDING','IN_PROGRESS','READY','SUBMITTED','WON','LOST','ACCEPTED']).optional(),
  outcome:            z.enum(['WON','LOST','ACCEPTED','RECOVERED','VB_EXCEPTION']).optional().nullable(),
  issuerNotes:        z.string().optional().nullable(),
  notesForBank:       z.string().optional().nullable(),
  internalNotes:      z.string().optional().nullable(),
  cancelPolicy:       z.string().optional().nullable(),
  affirmLink:         z.string().url().optional().nullable().or(z.literal('')),
  reservationNumber:  z.string().optional().nullable(),
  confirmationNumber: z.string().optional().nullable(),
  // CaseDetail subfields
  details: z.object({
    hotelName:          z.string().optional().nullable(),
    hotelAddress:       z.string().optional().nullable(),
    roomType:           z.string().optional().nullable(),
    checkInDate:        z.string().optional().nullable(),
    checkOutDate:       z.string().optional().nullable(),
    guestName:          z.string().optional().nullable(),
    bookingDate:        z.string().optional().nullable(),
    bookingInterface:   z.string().optional().nullable(),
    cardholderName:     z.string().optional().nullable(),
    billingAddress:     z.string().optional().nullable(),
    billingCity:        z.string().optional().nullable(),
    billingZip:         z.string().optional().nullable(),
    billingPhone:       z.string().optional().nullable(),
    email:              z.string().optional().nullable(),
    ipAddress:          z.string().optional().nullable(),
    authorizationCode:  z.string().optional().nullable(),
    avsResult:          z.string().optional().nullable(),
    cvvResult:          z.string().optional().nullable(),
    accertifyScore:     z.string().optional().nullable(),
    cancellationDate:   z.string().optional().nullable(),
    cancellationPolicy: z.string().optional().nullable(),
    totalAmount:        z.number().nonnegative().optional().nullable(),
  }).optional(),
}).strict();

// ─── GET /api/cases/[id] ─────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const c = await prisma.case.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      details: true,
      claimedBy: { select: { id: true, name: true } },
      rebuttals: {
        orderBy: { createdAt: 'desc' },
      },
      evidence: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!c) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ case: c });
}

// ─── PATCH /api/cases/[id] ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.case.findFirst({
    where: { id, orgId: user.orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ANALYST can only update if the case is claimed by them
  const roleLevels: Record<string, number> = {
    VIEWER: 1, ANALYST: 2, MANAGER: 3, LEADER: 4, ADMIN: 5,
  };
  const isManager = roleLevels[user.role] >= roleLevels['MANAGER'];
  if (!isManager && user.role === 'ANALYST' && existing.claimedById !== user.id) {
    return NextResponse.json({ error: 'Forbidden: case not claimed by you' }, { status: 403 });
  }
  if (roleLevels[user.role] < roleLevels['ANALYST']) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { details: detailsPatch, ...caseFields } = parsed.data;

  const previousValue = JSON.stringify({
    status: existing.status,
    outcome: existing.outcome,
    ...caseFields,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCase = await tx.case.update({
      where: { id },
      data: {
        ...caseFields,
        dueDate: caseFields.dueDate ? new Date(caseFields.dueDate) : caseFields.dueDate === null ? null : undefined,
        updatedAt: new Date(),
      },
      include: {
        details: true,
        claimedBy: { select: { id: true, name: true } },
        rebuttals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (detailsPatch && Object.keys(detailsPatch).length > 0) {
      const detailData = {
        ...detailsPatch,
        checkInDate:      detailsPatch.checkInDate     ? new Date(detailsPatch.checkInDate)     : detailsPatch.checkInDate     === null ? null : undefined,
        checkOutDate:     detailsPatch.checkOutDate    ? new Date(detailsPatch.checkOutDate)    : detailsPatch.checkOutDate    === null ? null : undefined,
        bookingDate:      detailsPatch.bookingDate     ? new Date(detailsPatch.bookingDate)     : detailsPatch.bookingDate     === null ? null : undefined,
        cancellationDate: detailsPatch.cancellationDate ? new Date(detailsPatch.cancellationDate) : detailsPatch.cancellationDate === null ? null : undefined,
      };
      await tx.caseDetail.upsert({
        where: { caseId: id },
        create: { caseId: id, ...detailData },
        update: detailData,
      });
    }

    return updatedCase;
  });

  await writeAuditLog({
    orgId:         user.orgId,
    userId:        user.id,
    caseId:        id,
    action:        'UPDATE',
    module:        'CASE',
    entityType:    'Case',
    entityId:      id,
    details:       `Case ${existing.caseNumber} updated`,
    previousValue,
    newValue:      JSON.stringify(caseFields),
  });

  return NextResponse.json({ case: updated });
}

// ─── DELETE /api/cases/[id] ───────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: ADMIN only' }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.case.findFirst({
    where: { id, orgId: user.orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.case.delete({ where: { id } });

  await writeAuditLog({
    orgId:      user.orgId,
    userId:     user.id,
    caseId:     id,
    action:     'DELETE',
    module:     'CASE',
    entityType: 'Case',
    entityId:   id,
    details:    `Case ${existing.caseNumber} permanently deleted`,
  });

  return new NextResponse(null, { status: 204 });
}
