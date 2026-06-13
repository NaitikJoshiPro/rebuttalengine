import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import StatusBadge from '@/components/portal/StatusBadge';
import ReasonCodeBadge from '@/components/portal/ReasonCodeBadge';
import type { Prisma } from '@prisma/client';
import type { CaseStatus, ReasonCode } from '@/types';
import { hasPermission } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number | string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(typeof n === 'string' ? parseFloat(n) : n);
}

function fmtDate(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = {
  status?: string;
  reasonCode?: string;
  portal?: string;
  q?: string;
  page?: string;
  filter?: string;
};

const PAGE_SIZE = 25;

const ALL_STATUSES: CaseStatus[] = [
  'UNCLAIMED', 'PENDING', 'IN_PROGRESS', 'READY', 'SUBMITTED', 'WON', 'LOST', 'ACCEPTED',
];

const ALL_REASON_CODES: ReasonCode[] = [
  'CANCELLED_RECURRING',
  'FRAUD',
  'PRODUCT_NOT_RECEIVED',
  'PRODUCT_UNSATISFACTORY',
  'TRANSACTION_AMOUNT_DIFFERS',
];

const REASON_LABELS: Record<ReasonCode, string> = {
  CANCELLED_RECURRING:        'Cancelled Recurring',
  FRAUD:                      'Fraud',
  PRODUCT_NOT_RECEIVED:       'Not Received',
  PRODUCT_UNSATISFACTORY:     'Unsatisfactory',
  TRANSACTION_AMOUNT_DIFFERS: 'Amt Differs',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'RCA Manager' };

export default async function RcaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAuth();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? '1', 10));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Build where clause
  const where: Prisma.CaseWhereInput = { orgId: user.orgId };

  if (sp.status && ALL_STATUSES.includes(sp.status as CaseStatus)) {
    where.status = sp.status as CaseStatus;
  }
  if (sp.filter === 'due_today') {
    where.dueDate = { gte: today, lt: tomorrow };
  }
  if (sp.reasonCode && ALL_REASON_CODES.includes(sp.reasonCode as ReasonCode)) {
    where.reasonCode = sp.reasonCode as ReasonCode;
  }
  if (sp.portal) {
    where.portal = { contains: sp.portal, mode: 'insensitive' };
  }
  if (sp.q) {
    where.OR = [
      { caseNumber: { contains: sp.q, mode: 'insensitive' } },
      { itnNumber: { contains: sp.q, mode: 'insensitive' } },
    ];
  }

  const [total, cases, portals] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        claimedBy: { select: { id: true, name: true } },
        rebuttals: { select: { id: true }, take: 1 },
      },
    }),
    prisma.case.groupBy({
      by: ['portal'],
      where: { orgId: user.orgId },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isAnalystPlus = hasPermission(user.role, 'ANALYST');

  const uniquePortals = portals
    .map((p) => p.portal)
    .filter((p): p is string => Boolean(p));

  // Build filter URL helpers
  function filterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { status: sp.status, reasonCode: sp.reasonCode, portal: sp.portal, q: sp.q, page: '1', ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/rca?${params.toString()}`;
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-navy-900 font-900 text-2xl">RCA Manager</h1>
          <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} cases</p>
        </div>
        {isAnalystPlus && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link href={'/rca/new' as any} className="btn-primary">
            + New Case
          </Link>
        )}
      </div>

      {/* Filter bar */}
      <form method="GET" action="/rca" className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status */}
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="form-input"
          style={{ width: 160 }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>

        {/* Reason code */}
        <select
          name="reasonCode"
          defaultValue={sp.reasonCode ?? ''}
          className="form-input"
          style={{ width: 200 }}
        >
          <option value="">All Reason Codes</option>
          {ALL_REASON_CODES.map((rc) => (
            <option key={rc} value={rc}>
              {REASON_LABELS[rc]}
            </option>
          ))}
        </select>

        {/* Portal */}
        <select
          name="portal"
          defaultValue={sp.portal ?? ''}
          className="form-input"
          style={{ width: 160 }}
        >
          <option value="">All Portals</option>
          {uniquePortals.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Search */}
        <input
          type="text"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Case # or ITN…"
          className="form-input flex-1 min-w-[160px]"
        />

        <button type="submit" className="btn-primary" style={{ padding: '12px 20px' }}>
          Search
        </button>

        {(sp.status || sp.reasonCode || sp.portal || sp.q || sp.filter) && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link href={'/rca' as any} className="btn-secondary" style={{ padding: '12px 20px' }}>
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-100 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Case #</th>
              <th>ITN Number</th>
              <th>Reason Code</th>
              <th>Portal</th>
              <th className="text-right">Dispute Amt</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Analyst</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">
                  No cases match your filters
                </td>
              </tr>
            )}
            {cases.map((c) => {
              const due = c.dueDate ? new Date(c.dueDate) : null;
              const now = new Date();
              const isOverdue = due && due < now;
              const isToday = due && due >= today && due < tomorrow;
              const dueDateColor = isOverdue ? '#dc2626' : isToday ? '#d97706' : '#6b7280';

              const hasRebuttal = c.rebuttals.length > 0;
              const isUnclaimed = c.status === 'UNCLAIMED';

              return (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      name="selected"
                      value={c.id}
                      className="accent-gold-500"
                      aria-label={`Select case ${c.caseNumber}`}
                    />
                  </td>
                  <td>
                    <Link
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      href={`/rca/${c.id}` as any}
                      className="font-700 text-navy-900 hover:text-gold-500 transition-colors"
                    >
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td className="text-gray-500">{c.itnNumber}</td>
                  <td>
                    <ReasonCodeBadge code={c.reasonCode as ReasonCode} />
                  </td>
                  <td className="text-gray-500">{c.portal ?? '—'}</td>
                  <td className="text-right font-700 text-navy-900">
                    {fmt$(c.disputeAmount.toString())}
                  </td>
                  <td style={{ color: dueDateColor, fontWeight: 600 }}>
                    {fmtDate(due)}
                  </td>
                  <td>
                    <StatusBadge status={c.status as CaseStatus} />
                  </td>
                  <td className="text-gray-500">
                    {c.claimedBy?.name ?? (
                      <span className="text-gray-300">Unclaimed</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Link
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        href={`/rca/${c.id}` as any}
                        className="text-gold-500 text-xs font-700 uppercase"
                        style={{ letterSpacing: '1px' }}
                      >
                        View
                      </Link>
                      {isUnclaimed && isAnalystPlus && (
                        <Link
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          href={`/rca/${c.id}?action=claim` as any}
                          className="text-navy-600 text-xs font-700 uppercase"
                          style={{ letterSpacing: '1px' }}
                        >
                          Claim
                        </Link>
                      )}
                      {!hasRebuttal && isAnalystPlus && (
                        <Link
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          href={`/rca/${c.id}?action=generate` as any}
                          className="text-gray-400 text-xs font-700 uppercase"
                          style={{ letterSpacing: '1px' }}
                        >
                          Generate
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-gray-400 text-xs font-600">
          Page {page} of {totalPages} &mdash; {total.toLocaleString()} cases
        </p>
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={filterUrl({ page: String(page - 1) }) as any}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 10 }}
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={filterUrl({ page: String(page + 1) }) as any}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 10 }}
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
