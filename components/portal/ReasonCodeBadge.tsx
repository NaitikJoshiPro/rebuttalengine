import type { ReasonCode } from '@/types';

const REASON_CODE_MAP: Record<ReasonCode, string> = {
  CANCELLED_RECURRING:       'Cancelled Recurring',
  FRAUD:                     'Fraud',
  PRODUCT_NOT_RECEIVED:      'Not Received',
  PRODUCT_UNSATISFACTORY:    'Unsatisfactory',
  TRANSACTION_AMOUNT_DIFFERS: 'Amt Differs',
};

interface ReasonCodeBadgeProps {
  code: ReasonCode;
}

export default function ReasonCodeBadge({ code }: ReasonCodeBadgeProps) {
  return <span className="badge badge-navy">{REASON_CODE_MAP[code]}</span>;
}
