import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtBytes(n: number | null) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type SearchParams = { q?: string; caseId?: string };

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ fileType }: { fileType: string }) {
  const cls =
    fileType === 'pdf'
      ? 'badge badge-red'
      : fileType === 'image'
        ? 'badge badge-gold'
        : 'badge badge-navy';
  return <span className={cls}>{fileType.toUpperCase()}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Evidence Library' };

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAuth();
  const sp = await searchParams;

  const where: Prisma.EvidenceWhereInput = { orgId: user.orgId };

  if (sp.caseId) {
    where.caseId = sp.caseId;
  }
  if (sp.q) {
    where.OR = [
      { label: { contains: sp.q, mode: 'insensitive' } },
      { case: { caseNumber: { contains: sp.q, mode: 'insensitive' } } },
    ];
  }

  const evidence = await prisma.evidence.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      case: { select: { id: true, caseNumber: true } },
    },
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-navy-900 font-900 text-2xl">Evidence Library</h1>
          <p className="text-gray-400 text-sm mt-1">{evidence.length.toLocaleString()} files</p>
        </div>
      </div>

      {/* Filter bar */}
      <form method="GET" action="/evidence" className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search by file name or case #…"
          className="form-input flex-1 min-w-[200px]"
        />
        <input
          type="text"
          name="caseId"
          defaultValue={sp.caseId ?? ''}
          placeholder="Case ID filter…"
          className="form-input"
          style={{ width: 200 }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '12px 20px' }}>
          Search
        </button>
        {(sp.q || sp.caseId) && (
          <Link
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            href={'/evidence' as any}
            className="btn-secondary"
            style={{ padding: '12px 20px' }}
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-100 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Case</th>
              <th>Type</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {evidence.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No evidence files found
                </td>
              </tr>
            )}
            {evidence.map((ev) => (
              <tr key={ev.id}>
                <td className="font-600 text-navy-900">{ev.label}</td>
                <td>
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    href={`/rca/${ev.case.id}` as any}
                    className="text-gold-500 font-700 text-xs uppercase"
                    style={{ letterSpacing: '1px' }}
                  >
                    {ev.case.caseNumber}
                  </Link>
                </td>
                <td>
                  <TypeBadge fileType={ev.fileType} />
                </td>
                <td className="text-gray-400">{fmtBytes(ev.fileSize)}</td>
                <td className="text-gray-400">{fmtDate(ev.createdAt)}</td>
                <td>
                  <a
                    href={ev.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-500 text-xs font-700 uppercase"
                    style={{ letterSpacing: '1px' }}
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
