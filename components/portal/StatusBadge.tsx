import type { CaseStatus } from '@/types';

const STATUS_MAP: Record<CaseStatus, { label: string; cls: string }> = {
  UNCLAIMED:   { label: 'Unclaimed',   cls: 'badge badge-gray'  },
  PENDING:     { label: 'Pending',     cls: 'badge badge-amber' },
  IN_PROGRESS: { label: 'In Progress', cls: 'badge badge-gold'  },
  READY:       { label: 'Ready',       cls: 'badge badge-green' },
  SUBMITTED:   { label: 'Submitted',   cls: 'badge badge-navy'  },
  WON:         { label: 'Won',         cls: 'badge badge-green' },
  LOST:        { label: 'Lost',        cls: 'badge badge-red'   },
  ACCEPTED:    { label: 'Accepted',    cls: 'badge badge-gray'  },
};

interface StatusBadgeProps {
  status: CaseStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, cls } = STATUS_MAP[status];
  return <span className={cls}>{label}</span>;
}
