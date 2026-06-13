import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { put } from '@vercel/blob';
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

type RouteContext = { params: Promise<{ id: string }> };

// ─── PDF Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginHorizontal: -48,
    marginTop: -40,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#B8953A',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSub: {
    color: '#7A95A5',
    fontSize: 8,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#B8953A',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
    marginBottom: 8,
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 5,
  },
  tableLabel: {
    width: '35%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableValue: {
    width: '65%',
    fontSize: 10,
    color: '#111827',
  },
  bodyText: {
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
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  goldBar: {
    height: 2,
    backgroundColor: '#B8953A',
    marginBottom: 12,
    width: 48,
  },
});

// ─── PDF Document component ───────────────────────────────────────────────────

function RebuttalPDF({
  caseData,
  rebuttalContent,
  generatedDate,
}: {
  caseData: {
    caseNumber: string;
    itnNumber: string;
    reasonCode: string;
    disputeType: string;
    portal: string | null;
    currency: string;
    disputeAmount: number;
    receivedDate: Date;
    dueDate: Date | null;
    transactionDate: Date | null;
    transactionAmount: number | null;
    mop: string | null;
  };
  rebuttalContent: string;
  generatedDate: string;
}) {
  const fmt = (d: Date | null | undefined) =>
    d ? new Intl.DateTimeFormat('en-US').format(d) : 'N/A';
  const money = (v: number | null | undefined, currency = 'USD') =>
    v != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v)
      : 'N/A';

  const fields: [string, string][] = [
    ['Case Number',        caseData.caseNumber],
    ['ITN Number',         caseData.itnNumber],
    ['Reason Code',        caseData.reasonCode.replace(/_/g, ' ')],
    ['Dispute Type',       caseData.disputeType],
    ['Portal',             caseData.portal ?? 'N/A'],
    ['Method of Payment',  caseData.mop ?? 'N/A'],
    ['Currency',           caseData.currency],
    ['Dispute Amount',     money(caseData.disputeAmount, caseData.currency)],
    ['Transaction Amount', money(caseData.transactionAmount, caseData.currency)],
    ['Received Date',      fmt(caseData.receivedDate)],
    ['Transaction Date',   fmt(caseData.transactionDate)],
    ['Due Date',           fmt(caseData.dueDate)],
  ];

  return React.createElement(
    Document,
    { title: `Rebuttal — ${caseData.caseNumber}` },
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.headerTitle }, 'Chargeback Rebuttal Letter'),
          React.createElement(Text, { style: styles.headerSub }, 'Confidential — For Bank/Acquirer Use'),
        ),
        React.createElement(
          View,
          { style: { alignItems: 'flex-end' } },
          React.createElement(Text, { style: { color: '#B8953A', fontSize: 9, fontFamily: 'Helvetica-Bold' } }, caseData.caseNumber),
          React.createElement(Text, { style: { color: '#7A95A5', fontSize: 8, marginTop: 2 } }, generatedDate),
        ),
      ),

      // Transaction details section
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Transaction Details'),
        React.createElement(
          View,
          { style: styles.table },
          ...fields.map(([label, value]) =>
            React.createElement(
              View,
              { key: label, style: styles.tableRow },
              React.createElement(Text, { style: styles.tableLabel }, label),
              React.createElement(Text, { style: styles.tableValue }, value),
            ),
          ),
        ),
      ),

      // Rebuttal body section
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Rebuttal Letter'),
        React.createElement(View, { style: styles.goldBar }),
        React.createElement(Text, { style: styles.bodyText }, rebuttalContent),
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, `Generated: ${generatedDate}`),
        React.createElement(Text, { style: styles.footerText }, `Case: ${caseData.caseNumber}`),
        React.createElement(Text, { style: styles.footerText }, 'Rebuttal Engine — Confidential'),
      ),
    ),
  );
}

// ─── GET /api/cases/[id]/export ───────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 1. Fetch case + latest approved rebuttal
  const c = await prisma.case.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      rebuttals: {
        where: { isApproved: true },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });
  if (!c) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fall back to latest rebuttal if none approved
  let rebuttal = c.rebuttals.at(0) ?? null;
  if (!rebuttal) {
    rebuttal = await prisma.rebuttal.findFirst({
      where: { caseId: id },
      orderBy: { version: 'desc' },
    });
  }
  if (!rebuttal) {
    return NextResponse.json({ error: 'No rebuttal found for this case. Generate one first.' }, { status: 422 });
  }

  const generatedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  // 2. Build PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(RebuttalPDF, {
        caseData: {
          caseNumber:       c.caseNumber,
          itnNumber:        c.itnNumber,
          reasonCode:       c.reasonCode,
          disputeType:      c.disputeType,
          portal:           c.portal,
          currency:         c.currency,
          disputeAmount:    Number(c.disputeAmount),
          receivedDate:     c.receivedDate,
          dueDate:          c.dueDate,
          transactionDate:  c.transactionDate,
          transactionAmount: c.transactionAmount != null ? Number(c.transactionAmount) : null,
          mop:              c.mop,
        },
        rebuttalContent: rebuttal.content,
        generatedDate,
      }) as unknown as React.ReactElement<{ title?: string }>,
    );
  } catch (err) {
    console.error('[export] PDF render error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }

  // 3. Upload to Vercel Blob
  let pdfUrl: string | null = null;
  try {
    const blobKey = `rebuttals/${id}/v${rebuttal.version}.pdf`;
    const blob = await put(blobKey, pdfBuffer, { access: 'public', contentType: 'application/pdf' });
    pdfUrl = blob.url;

    // 4. Update Rebuttal.pdfUrl
    await prisma.rebuttal.update({
      where: { id: rebuttal.id },
      data: { pdfUrl },
    });
  } catch (err) {
    // Blob upload is best-effort — still return the PDF bytes
    console.error('[export] Blob upload error:', err);
  }

  // 5. Audit log
  await writeAuditLog({
    orgId:      user.orgId,
    userId:     user.id,
    caseId:     id,
    action:     'EXPORT_PDF',
    module:     'REBUTTAL',
    entityType: 'Rebuttal',
    entityId:   rebuttal.id,
    details:    `PDF exported for case ${c.caseNumber} (v${rebuttal.version})${pdfUrl ? ` → ${pdfUrl}` : ''}`,
  });

  // 6. Return PDF bytes
  const filename = `rebuttal-${c.caseNumber}-v${rebuttal.version}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdfBuffer.length),
      'Cache-Control':       'no-store',
    },
  });
}
