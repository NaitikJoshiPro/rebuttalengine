import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CaseStatus, ReasonCode } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { isFraudCode } from '@/lib/rebuttal-engine';
import type { CaseListItem } from '@/types';

// ─── Zod schema for POST ──────────────────────────────────────────────────────

const createCaseSchema = z.object({
  caseNumber: z.string().min(1),
  itnNumber: z.string().min(1),
  reasonCode: z.enum([
    'CANCELLED_RECURRING',
    'FRAUD',
    'PRODUCT_NOT_RECEIVED',
    'PRODUCT_UNSATISFACTORY',
    'TRANSACTION_AMOUNT_DIFFERS',
  ]),
  disputeType: z.enum(['CB', 'INQ', 'PRE']).default('CB'),
  portal: z.string().optional(),
  currency: z.string().default('USD'),
  mop: z.string().optional(),
  receivedDate: z.string().datetime({ offset: true }).or(z.string().date()),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  transactionDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  disputeAmount: z.number().positive(),
  transactionAmount: z.number().positive().optional(),
  refundAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  serviceFeeAmount: z.number().nonnegative().optional(),
  reservationNumber: z.string().optional(),
  confirmationNumber: z.string().optional(),
  issuerNotes: z.string().optional(),
  notesForBank: z.string().optional(),
  internalNotes: z.string().optional(),
  cancelPolicy: z.string().optional(),
  affirmLink: z.string().url().optional().or(z.literal('')),
  // CaseDetail fields
  hotelName: z.string().optional(),
  hotelAddress: z.string().optional(),
  roomType: z.string().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  guestName: z.string().optional(),
  bookingDate: z.string().optional(),
  bookingInterface: z.string().optional(),
  cardholderName: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingZip: z.string().optional(),
  billingPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  ipAddress: z.string().optional(),
  authorizationCode: z.string().optional(),
  avsResult: z.string().optional(),
  cvvResult: z.string().optional(),
  accertifyScore: z.string().optional(),
  cancellationDate: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  totalAmount: z.number().nonnegative().optional(),
});

// ─── GET /api/cases ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status     = searchParams.get('status') ?? undefined;
  const reasonCode = searchParams.get('reasonCode') ?? undefined;
  const portal     = searchParams.get('portal') ?? undefined;
  const search     = searchParams.get('search') ?? undefined;
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize   = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)));
  const skip       = (page - 1) * pageSize;

  const where = {
    orgId: user.orgId,
    ...(status && Object.values(CaseStatus).includes(status as CaseStatus)
      ? { status: status as CaseStatus }
      : {}),
    ...(reasonCode && Object.values(ReasonCode).includes(reasonCode as ReasonCode)
      ? { reasonCode: reasonCode as ReasonCode }
      : {}),
    ...(portal ? { portal } : {}),
    ...(search
      ? {
          OR: [
            { caseNumber: { contains: search, mode: 'insensitive' as const } },
            { itnNumber:  { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rawCases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        claimedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.case.count({ where }),
  ]);

  const cases: CaseListItem[] = rawCases.map((c) => ({
    id:             c.id,
    caseNumber:     c.caseNumber,
    itnNumber:      c.itnNumber,
    reasonCode:     c.reasonCode,
    disputeType:    c.disputeType,
    portal:         c.portal,
    currency:       c.currency,
    disputeAmount:  Number(c.disputeAmount),
    receivedDate:   c.receivedDate.toISOString(),
    dueDate:        c.dueDate?.toISOString() ?? null,
    status:         c.status,
    templateStatus: c.templateStatus,
    outcome:        c.outcome ?? null,
    claimedBy:      c.claimedBy ? { id: c.claimedBy.id, name: c.claimedBy.name } : null,
    claimedAt:      c.claimedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ cases, total, page, pageSize });
}

// ─── POST /api/cases ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;

  const fraudDetected = isFraudCode(d.reasonCode, d.bookingInterface);

  const created = await prisma.$transaction(async (tx) => {
    const newCase = await tx.case.create({
      data: {
        orgId:              user.orgId,
        caseNumber:         d.caseNumber,
        itnNumber:          d.itnNumber,
        reservationNumber:  d.reservationNumber,
        confirmationNumber: d.confirmationNumber,
        reasonCode:         d.reasonCode,
        disputeType:        d.disputeType,
        portal:             d.portal,
        currency:           d.currency,
        mop:                d.mop,
        receivedDate:       new Date(d.receivedDate),
        dueDate:            d.dueDate ? new Date(d.dueDate) : undefined,
        transactionDate:    d.transactionDate ? new Date(d.transactionDate) : undefined,
        disputeAmount:      d.disputeAmount,
        transactionAmount:  d.transactionAmount,
        refundAmount:       d.refundAmount,
        taxAmount:          d.taxAmount,
        serviceFeeAmount:   d.serviceFeeAmount,
        issuerNotes:        d.issuerNotes,
        notesForBank:       d.notesForBank,
        internalNotes:      d.internalNotes,
        cancelPolicy:       d.cancelPolicy,
        affirmLink:         d.affirmLink || undefined,
        status:             'UNCLAIMED',
        templateStatus:     'PENDING',
        createdById:        user.id,
        requiresEmailConfirmation: fraudDetected,
        fraudCodeDetected:         fraudDetected,
        details: {
          create: {
            hotelName:          d.hotelName,
            hotelAddress:       d.hotelAddress,
            roomType:           d.roomType,
            checkInDate:        d.checkInDate ? new Date(d.checkInDate) : undefined,
            checkOutDate:       d.checkOutDate ? new Date(d.checkOutDate) : undefined,
            guestName:          d.guestName,
            bookingDate:        d.bookingDate ? new Date(d.bookingDate) : undefined,
            bookingInterface:   d.bookingInterface,
            cardholderName:     d.cardholderName,
            billingAddress:     d.billingAddress,
            billingCity:        d.billingCity,
            billingZip:         d.billingZip,
            billingPhone:       d.billingPhone,
            email:              d.email || undefined,
            ipAddress:          d.ipAddress,
            authorizationCode:  d.authorizationCode,
            avsResult:          d.avsResult,
            cvvResult:          d.cvvResult,
            accertifyScore:     d.accertifyScore,
            cancellationDate:   d.cancellationDate ? new Date(d.cancellationDate) : undefined,
            cancellationPolicy: d.cancellationPolicy,
            totalAmount:        d.totalAmount,
          },
        },
      },
      include: {
        details: true,
        claimedBy: { select: { id: true, name: true } },
      },
    });
    return newCase;
  });

  await writeAuditLog({
    orgId:      user.orgId,
    userId:     user.id,
    caseId:     created.id,
    action:     'CREATE',
    module:     'CASE',
    entityType: 'Case',
    entityId:   created.id,
    details:    `Case ${created.caseNumber} created`,
  });

  return NextResponse.json({ case: created }, { status: 201 });
}
