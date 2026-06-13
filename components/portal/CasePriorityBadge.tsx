interface CasePriorityBadgeProps {
  dueDate: string | null;
}

export default function CasePriorityBadge({ dueDate }: CasePriorityBadgeProps) {
  if (!dueDate) return <span className="badge badge-gray">No Due Date</span>;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return <span className="badge badge-red">Overdue</span>;
  if (diffDays === 0) return <span className="badge badge-amber">Today</span>;
  if (diffDays <= 3) return <span className="badge badge-gold">Urgent</span>;
  return <span className="badge badge-gray">Normal</span>;
}
