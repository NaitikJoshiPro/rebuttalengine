import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { buildRebuttalContext, assembleRebuttal } from '@/lib/rebuttal-engine';
import { getAnthropicClient } from '@/lib/anthropic';
import { put } from '@vercel/blob';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

type RouteContext = { params: Promise<{ id: string }> };

const bulkSchema = z.object({
  action:  z.enum(['generate', 'submit', 'export']),
  caseIds: z.array(z.string().cuid()).min(1).max(20),
});

// ─── Minimal PDF styles (reused from export route) ────────────────────────────

const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 48,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#0C1D2B',
    paddingVertical: 12,
    paddingHorizontal: 48,
    marginHorizontal: -48,
    marginTop: -40,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#B8953A',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSub: {
    color: '#7A95A5',
    fontSize: 8,
    marginTop: 2,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151',
    whiteSpace: 'pre-wrap',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  footerText: { fontSize: 8, color: '#9CA3AF' },
});

async function generateSingleRebuttal(
  caseId: string,
  orgId: string,
  userId: string,
  merchantName: string,
) {
  const c = await prisma.case.findFirst({
    where: { id: caseId, orgId },
    include: { details: true },
  });
  if (!c) return { caseId, success: false, error: 'Not found' };

  const d = c.details ?? {};
  const detailForEngine = {
    hotelName:          d.hotelName,
    hotelAddress:       d.hotelAddress,
    roomType:           d.roomType,
    checkInDate:        d.checkInDate?.toISOString() ?? null,
    checkOutDate:       d.checkOutDate?.toISOString() ?? null,
    guestName:          d.guestName,
    bookingDate:        d.bookingDate?.toISOString() ?? null,
    bookingInterface:   d.bookingInterface,
    cardholderName:     d.cardholderName,
    billingAddress:     d.billingAddress,
    billingCity:        d.billingCity,
    billingZip:         d.billingZip,
    billingPhone:       d.billingPhone,
    email:              d.email,
    ipAddress:          d.ipAddress,
    authorizationCode:  d.authorizationCode,
    avsResult:          d.avsResult,
    cvvResult:          d.cvvResult,
    accertifyScore:     d.accertifyScore,
    cancellationDate:   d.cancellationDate?.toISOString() ?? null,
    cancellationPolicy: d.cancellationPolicy,
    totalAmount:        d.totalAmount != null ? Number(d.totalAmount) : null,
    confirmationNumber: c.confirmationNumber,
    transactionAmount:  c.transactionAmount != null ? Number(c.transactionAmount) : null,
    taxAmount:          c.taxAmount != null ? Number(c.taxAmount) : null,
    serviceFeeAmount:   c.serviceFeeAmount != null ? Number(c.serviceFeeAmount) : null,
  };

  let ctx: ReturnType<typeof buildRebuttalContext>;
  try {
    ctx = buildRebuttalContext(c.reasonCode, merchantName, detailForEngine);
  } catch (err) {
    return { caseId, success: false, error: `Pattern error: ${String(err)}` };
  }

  let content = assembleRebuttal(ctx);
  let modelUsed: string | null = null;

  const anthropic = getAnthropicClient();
  if (anthropic) {
    try {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        temperature: 0.3,
        system:
          'You are a dispute resolution specialist. Enhance this rebuttal letter to be more persuasive and legally precise. Keep all facts. Return only the letter text.',
        messages: [{ role: 'user', content }],
      });
      const block = resp.content[0];
      if (block.type === 'text') {
        content   = block.text;
        modelUsed = 'claude-sonnet-4-6';
      }
    } catch (err) {
      console.error(`[bulk/generate] Claude failed for ${caseId}:`, err);
    }
  }

  const latest = await prisma.rebuttal.findFirst({
    where: { caseId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const rebuttal = await prisma.rebuttal.create({
    data: { caseId, orgId, content, version: nextVersion, modelUsed },
  });

  const statusUpdate: { templateStatus: 'READY'; status?: 'IN_PROGRESS' } = {
    templateStatus: 'READY',
  };
  if (c.status === 'PENDING') statusUpdate.status = 'IN_PROGRESS';
  await prisma.case.update({ where: { id: caseId }, data: statusUpdate });

  await writeAuditLog({
    orgId,
    userId,
    caseId,
    action:     'GENERATE_REBUTTAL',
    module:     'REBUTTAL',
    entityType: 'Rebuttal',
    entityId:   rebuttal.id,
    details:    `[Bulk] Rebuttal v${nextVersion} generated`,
  });

  return { caseId, success: true, rebuttalId: rebuttal.id };
}

async function exportSinglePDF(
  caseId: string,
  orgId: string,
  userId: string,
): Promise<{ caseId: string; success: boolean; pdfUrl?: string; error?: string }> {
  const c = await prisma.case.findFirst({
    where: { id: caseId, orgId },
    include: {
      rebuttals: {
        where: { isApproved: true },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });
  if (!c) return { caseId, success: false, error: 'Not found' };

  let rebuttal = c.rebuttals[0] ?? null;
  if (!rebuttal) {
    rebuttal = await prisma.rebuttal.findFirst({
      where: { caseId },
      orderBy: { version: 'desc' },
    });
  }
  if (!rebuttal) return { caseId, success: false, error: 'No rebuttal found' };

  const generatedDate = new Intl.DateTimeFormat('en-US').format(new Date());

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(
        Document,
        { title: `Rebuttal — ${c.caseNumber}` },
        React.createElement(
          Page,
          { size: 'LETTER', style: pdfStyles.page },
          React.createElement(
            View,
            { style: pdfStyles.header },
            React.createElement(Text, { style: pdfStyles.headerTitle }, 'Chargeback Rebuttal Letter'),
            React.createElement(Text, { style: pdfStyles.headerSub }, c.caseNumber),
          ),
          React.createElement(Text, { style: pdfStyles.body }, rebuttal.content),
          React.createElement(
            View,
            { style: pdfStyles.footer },
            React.createElement(Text, { style: pdfStyles.footerText }, `Generated: ${generatedDate}`),
            React.createElement(Text, { style: pdfStyles.footerText }, `Case: ${c.caseNumber}`),
          ),
        ),
      ),
    );
  } catch (err) {
    console.error(`[bulk/export] PDF render error for ${caseId}:`, err);
    return { caseId, success: false, error: 'PDF render failed' };
  }

  try {
    const blob = await put(
      `rebuttals/${caseId}/v${rebuttal.version}.pdf`,
      pdfBuffer,
      { access: 'public', contentType: 'application/pdf' },
    );
    await prisma.rebuttal.update({ where: { id: rebuttal.id }, data: { pdfUrl: blob.url } });
    await writeAuditLog({
      orgId,
      userId,
      caseId,
      action:     'EXPORT_PDF',
      module:     'REBUTTAL',
      entityType: 'Rebuttal',
      entityId:   rebuttal.id,
      details:    `[Bulk] PDF exported → ${blob.url}`,
    });
    return { caseId, success: true, pdfUrl: blob.url };
  } catch (err) {
    console.error(`[bulk/export] Blob upload error for ${caseId}:`, err);
    return { caseId, success: false, error: 'Blob upload failed' };
  }
}

// ─── POST /api/cases/[id]/bulk ────────────────────────────────────────────────
// Note: the [id] segment here is the org "context" case (unused) — the actual
// case IDs are provided in the body. The route is mounted on a specific case's
// path for consistency with the spec.

export async function POST(req: NextRequest, _ctx: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // MANAGER+ required
  const roleLevels: Record<string, number> = {
    VIEWER: 1, ANALYST: 2, MANAGER: 3, LEADER: 4, ADMIN: 5,
  };
  if (roleLevels[user.role] < roleLevels['MANAGER']) {
    return NextResponse.json({ error: 'Forbidden: MANAGER or above required for bulk actions' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { action, caseIds } = parsed.data;

  if (action === 'generate') {
    const results = [];
    for (const caseId of caseIds) {
      const result = await generateSingleRebuttal(caseId, user.orgId, user.id, user.merchantName);
      results.push(result);
    }
    return NextResponse.json({ action, results });
  }

  if (action === 'submit') {
    const results = await Promise.all(
      caseIds.map(async (caseId) => {
        const c = await prisma.case.findFirst({
          where: { id: caseId, orgId: user.orgId },
        });
        if (!c) return { caseId, success: false, error: 'Not found' };

        await prisma.case.update({
          where: { id: caseId },
          data: { status: 'SUBMITTED' },
        });

        await writeAuditLog({
          orgId:      user.orgId,
          userId:     user.id,
          caseId,
          action:     'SUBMIT',
          module:     'CASE',
          entityType: 'Case',
          entityId:   caseId,
          details:    `[Bulk] Case ${c.caseNumber} marked as SUBMITTED`,
        });

        return { caseId, success: true };
      }),
    );
    return NextResponse.json({ action, results });
  }

  if (action === 'export') {
    const results = [];
    for (const caseId of caseIds) {
      const result = await exportSinglePDF(caseId, user.orgId, user.id);
      results.push(result);
    }
    const urls = results
      .filter((r): r is typeof r & { success: true; pdfUrl: string } => r.success && !!r.pdfUrl)
      .map((r) => ({ caseId: r.caseId, pdfUrl: r.pdfUrl }));
    return NextResponse.json({ action, results, downloadUrls: urls });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
