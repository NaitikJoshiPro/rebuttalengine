import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { buildRebuttalContext, assembleRebuttal } from '@/lib/rebuttal-engine';
import { getAnthropicClient } from '@/lib/anthropic';
import type { RebuttalItem } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/cases/[id]/rebuttal ────────────────────────────────────────────

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
    select: { id: true },
  });
  if (!c) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rebuttals = await prisma.rebuttal.findMany({
    where: { caseId: id },
    orderBy: { createdAt: 'desc' },
  });

  const items: RebuttalItem[] = rebuttals.map((r) => ({
    id:         r.id,
    content:    r.content,
    pdfUrl:     r.pdfUrl,
    version:    r.version,
    modelUsed:  r.modelUsed,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    isApproved: r.isApproved,
    createdAt:  r.createdAt.toISOString(),
  }));

  return NextResponse.json({ rebuttals: items });
}

// ─── POST /api/cases/[id]/rebuttal ───────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Must be at least ANALYST
  const roleLevels: Record<string, number> = {
    VIEWER: 1, ANALYST: 2, MANAGER: 3, LEADER: 4, ADMIN: 5,
  };
  if (roleLevels[user.role] < roleLevels['ANALYST']) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // 1. Fetch case + caseDetail
  const c = await prisma.case.findFirst({
    where: { id, orgId: user.orgId },
    include: { details: true },
  });
  if (!c) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 2. Build rebuttal context
  const details = c.details ?? {};
  const detailForEngine = {
    hotelName:          details.hotelName,
    hotelAddress:       details.hotelAddress,
    roomType:           details.roomType,
    checkInDate:        details.checkInDate?.toISOString() ?? null,
    checkOutDate:       details.checkOutDate?.toISOString() ?? null,
    guestName:          details.guestName,
    bookingDate:        details.bookingDate?.toISOString() ?? null,
    bookingInterface:   details.bookingInterface,
    cardholderName:     details.cardholderName,
    billingAddress:     details.billingAddress,
    billingCity:        details.billingCity,
    billingZip:         details.billingZip,
    billingPhone:       details.billingPhone,
    email:              details.email,
    ipAddress:          details.ipAddress,
    authorizationCode:  details.authorizationCode,
    avsResult:          details.avsResult,
    cvvResult:          details.cvvResult,
    accertifyScore:     details.accertifyScore,
    cancellationDate:   details.cancellationDate?.toISOString() ?? null,
    cancellationPolicy: details.cancellationPolicy,
    totalAmount:        details.totalAmount != null ? Number(details.totalAmount) : null,
    confirmationNumber: c.confirmationNumber,
    transactionAmount:  c.transactionAmount != null ? Number(c.transactionAmount) : null,
    taxAmount:          c.taxAmount != null ? Number(c.taxAmount) : null,
    serviceFeeAmount:   c.serviceFeeAmount != null ? Number(c.serviceFeeAmount) : null,
  };

  let ctx: ReturnType<typeof buildRebuttalContext>;
  try {
    ctx = buildRebuttalContext(c.reasonCode, user.merchantName, detailForEngine);
  } catch (err) {
    console.error('[rebuttal] buildRebuttalContext error:', err);
    return NextResponse.json({ error: 'Failed to build rebuttal context' }, { status: 422 });
  }

  // 3. Assemble base rebuttal
  let content = assembleRebuttal(ctx);
  let modelUsed: string | null = null;

  // 4. Optionally enhance with Claude
  const anthropic = getAnthropicClient();
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 2000,
        temperature: 0.3,
        system:
          'You are a dispute resolution specialist. Enhance this rebuttal letter to be more persuasive and legally precise. Keep all facts. Return only the letter text.',
        messages: [{ role: 'user', content }],
      });
      const block = response.content[0];
      if (block.type === 'text') {
        content   = block.text;
        modelUsed = 'claude-sonnet-4-6';
      }
    } catch (err) {
      console.error('[rebuttal] Claude enhancement failed, using base rebuttal:', err);
    }
  }

  // 5. Store rebuttal (increment version if prior exists)
  const latest = await prisma.rebuttal.findFirst({
    where: { caseId: id },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const rebuttal = await prisma.rebuttal.create({
    data: {
      caseId:    id,
      orgId:     user.orgId,
      content,
      version:   nextVersion,
      modelUsed,
    },
  });

  // 6. Update case status
  const statusUpdate: { templateStatus: 'READY'; status?: 'IN_PROGRESS' } = {
    templateStatus: 'READY',
  };
  if (c.status === 'PENDING') {
    statusUpdate.status = 'IN_PROGRESS';
  }
  await prisma.case.update({
    where: { id },
    data: statusUpdate,
  });

  // 7. Audit log
  await writeAuditLog({
    orgId:      user.orgId,
    userId:     user.id,
    caseId:     id,
    action:     'GENERATE_REBUTTAL',
    module:     'REBUTTAL',
    entityType: 'Rebuttal',
    entityId:   rebuttal.id,
    details:    `Rebuttal v${nextVersion} generated${modelUsed ? ` with ${modelUsed}` : ' (base template)'}`,
  });

  const item: RebuttalItem = {
    id:         rebuttal.id,
    content:    rebuttal.content,
    pdfUrl:     rebuttal.pdfUrl,
    version:    rebuttal.version,
    modelUsed:  rebuttal.modelUsed,
    confidence: rebuttal.confidence != null ? Number(rebuttal.confidence) : null,
    isApproved: rebuttal.isApproved,
    createdAt:  rebuttal.createdAt.toISOString(),
  };

  return NextResponse.json({ rebuttal: item }, { status: 201 });
}
