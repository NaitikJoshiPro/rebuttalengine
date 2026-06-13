'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Copy, RefreshCw, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '@/components/portal/StatusBadge';
import ReasonCodeBadge from '@/components/portal/ReasonCodeBadge';
import type { CaseDetail, CaseStatus, ReasonCode, RebuttalItem, UserRole } from '@/types';
import { hasPermission } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number | string | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(
    typeof n === 'string' ? parseFloat(n) : n,
  );
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: '#B8953A',
        marginBottom: 12,
        marginTop: 24,
      }}
    >
      {children}
    </h3>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#9ca3af',
          minWidth: 140,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span className="text-navy-900 text-sm font-500">{value ?? '—'}</span>
    </div>
  );
}

// ─── Collapsible text ─────────────────────────────────────────────────────────

function CollapsibleText({ text, maxChars = 200 }: { text: string; maxChars?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxChars) return <p className="text-sm text-gray-600 whitespace-pre-wrap">{text}</p>;

  return (
    <div>
      <p className="text-sm text-gray-600 whitespace-pre-wrap">
        {expanded ? text : `${text.slice(0, maxChars)}…`}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 mt-1 text-gold-500"
        style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#059669' : pct >= 40 ? '#B8953A' : '#dc2626';
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af' }}>
          AI Confidence
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 w-full">
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ─── Evidence checklist per reason code ──────────────────────────────────────

const EVIDENCE_TYPES: Record<ReasonCode, string[]> = {
  FRAUD: ['Authorization data', 'AVS/CVV results', 'IP address log', 'Accertify report', 'Booking confirmation'],
  CANCELLED_RECURRING: ['Cancellation policy', 'Guest communication', 'No-show evidence', 'Refund policy'],
  PRODUCT_NOT_RECEIVED: ['Booking confirmation', 'Hotel check-in records', 'Communication logs'],
  PRODUCT_UNSATISFACTORY: ['Guest correspondence', 'Resolution offered', 'Booking terms'],
  TRANSACTION_AMOUNT_DIFFERS: ['Original authorization', 'Itemized receipt', 'Fee disclosure'],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('VIEWER');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rebuttalContent, setRebuttalContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [approving, setApproving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Fetch case + session
  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const [caseRes, sessionRes] = await Promise.all([
        fetch(`/api/cases/${params.id}`),
        fetch('/api/auth/session'),
      ]);

      if (!caseRes.ok) throw new Error('Case not found');
      const caseJson = await caseRes.json() as { data: CaseDetail };
      const sessionJson = await sessionRes.json() as { user?: { id: string; role: UserRole } };

      setCaseData(caseJson.data);
      setUserRole(sessionJson.user?.role ?? 'VIEWER');
      setUserId(sessionJson.user?.id ?? '');

      // Load latest rebuttal into textarea
      const latest = caseJson.data.rebuttals[0];
      if (latest) setRebuttalContent(latest.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  // Claim
  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch(`/api/cases/${params.id}/claim`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to claim');
      await fetchCase();
    } finally {
      setClaiming(false);
    }
  }

  // Generate rebuttal
  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/cases/${params.id}/rebuttal`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Generation failed');
      }
      await fetchCase();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  // Regenerate
  async function handleRegenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/cases/${params.id}/rebuttal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regenerate: true }) });
      if (!res.ok) throw new Error('Regeneration failed');
      await fetchCase();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  // Approve
  async function handleApprove() {
    if (!caseData?.rebuttals[0]) return;
    setApproving(true);
    try {
      await fetch(`/api/cases/${params.id}/rebuttal/${caseData.rebuttals[0].id}/approve`, { method: 'POST' });
      await fetchCase();
    } finally {
      setApproving(false);
    }
  }

  // Copy
  async function handleCopy() {
    await navigator.clipboard.writeText(rebuttalContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Export PDF
  function handleExportPdf() {
    if (caseData?.rebuttals[0]?.pdfUrl) {
      window.open(caseData.rebuttals[0].pdfUrl, '_blank');
    } else {
      window.open(`/api/cases/${params.id}/rebuttal/pdf`, '_blank');
    }
  }

  // Restore version
  async function handleRestore(rebuttalId: string, content: string) {
    setRebuttalContent(content);
    await fetch(`/api/cases/${params.id}/rebuttal/${rebuttalId}/restore`, { method: 'POST' });
    await fetchCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading case…
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        {error ?? 'Case not found'}
      </div>
    );
  }

  const isAnalystPlus = hasPermission(userRole, 'ANALYST');
  const isManagerPlus = hasPermission(userRole, 'MANAGER');
  const isUnclaimed = caseData.status === 'UNCLAIMED';
  const isOwner = caseData.claimedBy?.id === userId;
  const canEdit = isAnalystPlus && (isOwner || isManagerPlus);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = caseData.dueDate ? new Date(caseData.dueDate) : null;
  const isOverdue = due && due < today;

  const latestRebuttal: RebuttalItem | null = caseData.rebuttals[0] ?? null;
  const olderRebuttals = caseData.rebuttals.slice(1);

  const d = caseData.details;

  return (
    <div className="flex h-full min-h-screen">
      {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
      <div
        className="flex flex-col bg-white border-r border-gray-200 overflow-y-auto shrink-0"
        style={{ width: '40%' }}
      >
        <div className="p-6">
          {/* Breadcrumb */}
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af', marginBottom: 12 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/rca' as any} className="hover:text-gold-500 transition-colors">RCA Manager</Link>
            {' › '}
            Case #{caseData.caseNumber}
          </p>

          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <h2 className="text-navy-900 font-900 text-xl flex-1">Case #{caseData.caseNumber}</h2>
            <StatusBadge status={caseData.status as CaseStatus} />
          </div>

          {/* Overdue warning */}
          {isOverdue && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-2 mb-4">
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#dc2626' }}>
                Overdue — Due {fmtDate(caseData.dueDate)}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4 mb-2">
            {isUnclaimed && isAnalystPlus && (
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="btn-primary"
                style={{ padding: '10px 20px' }}
              >
                {claiming ? 'Claiming…' : 'Claim Case'}
              </button>
            )}
            {canEdit && (
              <Link
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                href={`/rca/${caseData.id}/edit` as any}
                className="btn-secondary"
                style={{ padding: '10px 20px' }}
              >
                Edit Case
              </Link>
            )}
          </div>

          {/* ── DISPUTE INFO ────────────────────────────────────────────── */}
          <SectionHeading>Dispute Info</SectionHeading>
          <div>
            <div className="flex items-start gap-2 py-1.5 border-b border-gray-50">
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', minWidth: 140, flexShrink: 0 }}>Reason Code</span>
              <ReasonCodeBadge code={caseData.reasonCode as ReasonCode} />
            </div>
            <DetailRow label="Dispute Type" value={caseData.disputeType} />
            <DetailRow label="Portal" value={caseData.portal} />
            <DetailRow label="Currency" value={caseData.currency} />
            <DetailRow label="Dispute Amount" value={fmt$(caseData.disputeAmount)} />
            <DetailRow label="Received Date" value={fmtDate(caseData.receivedDate)} />
            <DetailRow label="Due Date" value={fmtDate(caseData.dueDate)} />
          </div>

          {/* ── RESERVATION ─────────────────────────────────────────────── */}
          <SectionHeading>Reservation</SectionHeading>
          <div>
            <DetailRow label="ITN Number" value={caseData.itnNumber} />
            <DetailRow label="Reservation #" value={caseData.reservationNumber} />
            <DetailRow label="Hotel Name" value={d?.hotelName} />
            <DetailRow label="Room Type" value={d?.roomType} />
            <DetailRow label="Check-In" value={fmtDate(d?.checkInDate ?? null)} />
            <DetailRow label="Check-Out" value={fmtDate(d?.checkOutDate ?? null)} />
            <DetailRow label="Guest Name" value={d?.guestName} />
          </div>

          {/* ── TRANSACTION ─────────────────────────────────────────────── */}
          <SectionHeading>Transaction</SectionHeading>
          <div>
            <DetailRow label="Transaction Date" value={fmtDate(caseData.transactionDate ?? null)} />
            <DetailRow label="Amount" value={fmt$(caseData.transactionAmount ?? null)} />
            <DetailRow label="Authorization Code" value={d?.authorizationCode} />
            <DetailRow label="Booking Interface" value={d?.bookingInterface} />
            <DetailRow label="Method of Payment" value={caseData.mop} />
            <DetailRow label="Tax Amount" value={fmt$(caseData.taxAmount ?? null)} />
            <DetailRow label="Service Fee" value={fmt$(caseData.serviceFeeAmount ?? null)} />
          </div>

          {/* ── CARDHOLDER ──────────────────────────────────────────────── */}
          <SectionHeading>Cardholder</SectionHeading>
          <div>
            <DetailRow label="Name" value={d?.cardholderName} />
            <DetailRow label="Billing Address" value={d?.billingAddress} />
            <DetailRow label="City" value={d?.billingCity} />
            <DetailRow label="ZIP" value={d?.billingZip} />
            <DetailRow label="Phone" value={d?.billingPhone} />
            <DetailRow label="Email" value={d?.email} />
            <DetailRow label="IP Address" value={d?.ipAddress} />
          </div>

          {/* ── FRAUD SIGNALS ────────────────────────────────────────────── */}
          <SectionHeading>Fraud Signals</SectionHeading>
          <div>
            <DetailRow label="AVS Result" value={d?.avsResult} />
            <DetailRow label="CVV Result" value={d?.cvvResult} />
            <DetailRow label="Accertify Score" value={d?.accertifyScore} />
          </div>

          {/* ── CANCELLATION ────────────────────────────────────────────── */}
          <SectionHeading>Cancellation</SectionHeading>
          <div>
            <DetailRow label="Cancellation Date" value={fmtDate(d?.cancellationDate ?? null)} />
            {caseData.cancelPolicy && (
              <div className="mt-2">
                <CollapsibleText text={caseData.cancelPolicy} />
              </div>
            )}
          </div>

          {/* ── NOTES ───────────────────────────────────────────────────── */}
          <SectionHeading>Notes</SectionHeading>
          <div className="space-y-3">
            {caseData.issuerNotes && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 4 }}>Issuer Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{caseData.issuerNotes}</p>
              </div>
            )}
            {caseData.internalNotes && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 4 }}>Internal Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{caseData.internalNotes}</p>
              </div>
            )}
            {!caseData.issuerNotes && !caseData.internalNotes && (
              <p className="text-gray-300 text-sm">No notes</p>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 bg-white overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-navy-900 font-900 text-xl flex-1">Rebuttal Letter</h2>
            {latestRebuttal && (
              <span className="badge badge-navy">v{latestRebuttal.version}</span>
            )}
            {latestRebuttal?.isApproved && (
              <span className="badge badge-green">Approved</span>
            )}
          </div>

          {/* Confidence bar */}
          {latestRebuttal?.confidence && (
            <ConfidenceBar score={Number(latestRebuttal.confidence)} />
          )}

          {/* Empty state */}
          {!latestRebuttal && (
            <div className="border border-gray-100 p-10 text-center mb-6">
              <FileText size={40} strokeWidth={1} className="mx-auto text-gray-200 mb-4" />
              <p className="text-navy-900 font-700 mb-2">No rebuttal generated yet</p>
              <p className="text-gray-400 text-sm mb-6">Generate a bank-ready rebuttal letter using AI</p>

              {genError && (
                <p className="text-red-400 text-xs mb-4 font-600">{genError}</p>
              )}

              {isAnalystPlus && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn-primary"
                >
                  {generating ? 'Generating…' : 'Generate Rebuttal'}
                </button>
              )}

              {/* Evidence checklist */}
              <div className="mt-8 text-left">
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8953A', marginBottom: 12 }}>
                  Recommended Evidence
                </p>
                <ul className="space-y-2">
                  {EVIDENCE_TYPES[caseData.reasonCode as ReasonCode]?.map((ev) => (
                    <li key={ev} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-3 h-3 border border-gray-300 shrink-0" />
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Rebuttal textarea */}
          {latestRebuttal && (
            <>
              <textarea
                className="form-input w-full font-mono text-sm"
                style={{ minHeight: 400, resize: 'vertical', lineHeight: 1.6 }}
                value={rebuttalContent}
                onChange={(e) => setRebuttalContent(e.target.value)}
                aria-label="Rebuttal letter content"
              />

              {genError && (
                <p className="text-red-400 text-xs mt-2 font-600">{genError}</p>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {isAnalystPlus && (
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="btn-secondary flex items-center gap-2"
                    style={{ padding: '10px 16px' }}
                  >
                    <RefreshCw size={14} />
                    {generating ? 'Regenerating…' : 'Regenerate'}
                  </button>
                )}

                {isManagerPlus && !latestRebuttal.isApproved && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={approving}
                    className="btn-primary flex items-center gap-2"
                    style={{ padding: '10px 16px', backgroundColor: '#059669' }}
                  >
                    <CheckCircle size={14} />
                    {approving ? 'Approving…' : 'Approve'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="btn-primary flex items-center gap-2"
                  style={{ padding: '10px 16px' }}
                >
                  <FileText size={14} />
                  Export PDF
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-ghost flex items-center gap-2 text-gray-400 hover:text-navy-900"
                  aria-label="Copy rebuttal"
                >
                  <Copy size={14} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Version history */}
              {olderRebuttals.length > 0 && (
                <div className="mt-8">
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8953A', marginBottom: 12 }}>
                    Version History
                  </p>
                  <div className="space-y-2">
                    {olderRebuttals.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between border border-gray-100 px-4 py-3"
                      >
                        <div>
                          <span className="badge badge-gray mr-2">v{r.version}</span>
                          <span className="text-gray-400 text-xs">{fmtDateTime(r.createdAt)}</span>
                          {r.isApproved && <span className="badge badge-green ml-2">Approved</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestore(r.id, r.content)}
                          className="text-gold-500 text-xs font-700 uppercase"
                          style={{ letterSpacing: '1px' }}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
