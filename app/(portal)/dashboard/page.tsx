import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import StatusBadge from '@/components/portal/StatusBadge';
import type { CaseStatus, ReasonCode } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const REASON_LABELS: Record<ReasonCode, string> = {
  CANCELLED_RECURRING:        'Cancelled Recurring',
  FRAUD:                      'Fraud',
  PRODUCT_NOT_RECEIVED:       'Not Received',
  PRODUCT_UNSATISFACTORY:     'Unsatisfactory',
  TRANSACTION_AMOUNT_DIFFERS: 'Amt Differs',
};

const REASON_CODES: ReasonCode[] = [
  'FRAUD',
  'CANCELLED_RECURRING',
  'PRODUCT_NOT_RECEIVED',
  'PRODUCT_UNSATISFACTORY',
  'TRANSACTION_AMOUNT_DIFFERS',
];

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: 'green' | 'red';
}) {
  return (
    <div className="bg-white border border-gray-100 p-6">
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#9ca3af',
          marginBottom: 12,
        }}
      >
        {label}
      </p>
      <p className="text-navy-900 font-900 text-3xl leading-none">{value}</p>
      {sub && (
        <p
          className="mt-2 text-xs font-600"
          style={{ color: subColor === 'green' ? '#059669' : subColor === 'red' ? '#dc2626' : '#6b7280' }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Aggregate stats
  const [totalCases, unclaimed, dueToday, overdue, won, lost, recentCases, reasonCodeCounts] =
    await Promise.all([
      prisma.case.count({ where: { orgId: user.orgId } }),
      prisma.case.count({ where: { orgId: user.orgId, status: 'UNCLAIMED' } }),
      prisma.case.count({
        where: { orgId: user.orgId, dueDate: { gte: today, lt: tomorrow } },
      }),
      prisma.case.count({
        where: { orgId: user.orgId, dueDate: { lt: today }, status: { notIn: ['WON', 'LOST', 'ACCEPTED', 'SUBMITTED'] } },
      }),
      prisma.case.count({ where: { orgId: user.orgId, status: 'WON' } }),
      prisma.case.count({ where: { orgId: user.orgId, status: 'LOST' } }),
      prisma.case.findMany({
        where: { orgId: user.orgId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { claimedBy: { select: { id: true, name: true } } },
      }),
      prisma.case.groupBy({
        by: ['reasonCode'],
        where: { orgId: user.orgId },
        _count: { _all: true },
      }),
    ]);

  const closedCases = won + lost;
  const winRate = closedCases > 0 ? Math.round((won / closedCases) * 100) : 0;

  // Build reason code map
  const rcMap: Record<string, number> = {};
  for (const row of reasonCodeCounts) {
    rcMap[row.reasonCode] = row._count._all;
  }
  const maxRcCount = Math.max(...Object.values(rcMap), 1);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-navy-900 font-900 text-2xl">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of your chargeback operations</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Cases" value={totalCases.toLocaleString()} />
        <KpiCard label="Unclaimed" value={unclaimed.toLocaleString()} />
        <KpiCard
          label="Due Today"
          value={dueToday.toLocaleString()}
          sub={overdue > 0 ? `${overdue} overdue` : undefined}
          subColor="red"
        />
        <KpiCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${won} won / ${lost} lost`}
          subColor={winRate > 50 ? 'green' : 'red'}
        />
      </div>

      {/* Recent cases table */}
      <div>
        <h2
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#B8953A',
            marginBottom: 12,
          }}
        >
          Recent Cases
        </h2>

        <div className="bg-white border border-gray-100 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case #</th>
                <th>ITN</th>
                <th>Reason Code</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Analyst</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentCases.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No cases yet
                  </td>
                </tr>
              )}
              {recentCases.map((c) => {
                const due = c.dueDate ? new Date(c.dueDate) : null;
                const isOverdue = due && due < today && !['WON', 'LOST', 'ACCEPTED', 'SUBMITTED'].includes(c.status);
                return (
                  <tr key={c.id}>
                    <td className="font-700 text-navy-900">{c.caseNumber}</td>
                    <td>{c.itnNumber}</td>
                    <td>{REASON_LABELS[c.reasonCode as ReasonCode]}</td>
                    <td>
                      <StatusBadge status={c.status as CaseStatus} />
                    </td>
                    <td style={{ color: isOverdue ? '#dc2626' : '#6b7280' }}>
                      {fmtDate(due)}
                    </td>
                    <td>{c.claimedBy?.name ?? <span className="text-gray-300">Unclaimed</span>}</td>
                    <td>
                      <Link
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        href={`/rca/${c.id}` as any}
                        className="text-gold-500 text-xs font-700 uppercase"
                        style={{ letterSpacing: '1px' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row: bar chart + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by reason code — pure CSS bar chart */}
        <div className="bg-white border border-gray-100 p-6">
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#B8953A',
              marginBottom: 16,
            }}
          >
            Cases by Reason Code
          </h2>

          <div className="space-y-4">
            {REASON_CODES.map((rc) => {
              const count = rcMap[rc] ?? 0;
              const pct = totalCases > 0 ? Math.round((count / maxRcCount) * 100) : 0;
              return (
                <div key={rc}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: '#6b7280',
                      }}
                    >
                      {REASON_LABELS[rc]}
                    </span>
                    <span className="text-xs text-gray-400 font-700">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 w-full">
                    <div
                      className="h-2 bg-gold-500"
                      style={{ width: `${pct}%`, transition: 'width 0.4s ease' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-gray-100 p-6">
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#B8953A',
              marginBottom: 16,
            }}
          >
            Quick Actions
          </h2>

          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/rca/new' as any} className="btn-primary w-full justify-center">
              + New Case
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/rca?filter=due_today' as any} className="btn-secondary w-full justify-center">
              View All Due Today
            </Link>
          </div>

          {/* Summary stats */}
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af' }}>
                Won
              </p>
              <p className="text-navy-900 font-900 text-xl mt-1">{won}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af' }}>
                Lost
              </p>
              <p className="text-navy-900 font-900 text-xl mt-1">{lost}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af' }}>
                Overdue
              </p>
              <p className="font-900 text-xl mt-1" style={{ color: overdue > 0 ? '#dc2626' : '#111827' }}>
                {overdue}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af' }}>
                Dispute Value
              </p>
              <p className="text-navy-900 font-900 text-xl mt-1">
                {fmt$(0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
