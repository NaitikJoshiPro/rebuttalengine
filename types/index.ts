// ─── Role system ─────────────────────────────────────────────────────────────

export type UserRole = 'VIEWER' | 'ANALYST' | 'MANAGER' | 'LEADER' | 'ADMIN';

export const ROLE_LEVEL: Record<UserRole, number> = {
  VIEWER:  1,
  ANALYST: 2,
  MANAGER: 3,
  LEADER:  4,
  ADMIN:   5,
};

export function hasPermission(userRole: UserRole, required: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[required];
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ReasonCode =
  | 'CANCELLED_RECURRING'
  | 'FRAUD'
  | 'PRODUCT_NOT_RECEIVED'
  | 'PRODUCT_UNSATISFACTORY'
  | 'TRANSACTION_AMOUNT_DIFFERS';

export type DisputeType = 'CB' | 'INQ' | 'PRE';

export type CaseStatus =
  | 'UNCLAIMED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'READY'
  | 'SUBMITTED'
  | 'WON'
  | 'LOST'
  | 'ACCEPTED';

export type TemplateStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
export type CaseOutcome = 'WON' | 'LOST' | 'ACCEPTED' | 'RECOVERED' | 'VB_EXCEPTION';

// ─── Case model ───────────────────────────────────────────────────────────────

export interface CaseListItem {
  id: string;
  caseNumber: string;
  itnNumber: string;
  reasonCode: ReasonCode;
  disputeType: DisputeType;
  portal: string | null;
  currency: string;
  disputeAmount: number;
  receivedDate: string;
  dueDate: string | null;
  status: CaseStatus;
  templateStatus: TemplateStatus;
  outcome: CaseOutcome | null;
  claimedBy: { id: string; name: string } | null;
  claimedAt: string | null;
}

export interface CaseDetail extends CaseListItem {
  reservationNumber: string | null;
  confirmationNumber: string | null;
  transactionDate: string | null;
  transactionAmount: number | null;
  refundAmount: number | null;
  taxAmount: number | null;
  serviceFeeAmount: number | null;
  mop: string | null;
  issuerNotes: string | null;
  notesForBank: string | null;
  internalNotes: string | null;
  cancelPolicy: string | null;
  affirmLink: string | null;
  requiresEmailConfirmation: boolean;
  fraudCodeDetected: boolean;
  aiOutcome: string | null;
  aiConfidence: number | null;
  details: CaseDetailFields | null;
  rebuttals: RebuttalItem[];
}

export interface CaseDetailFields {
  hotelName: string | null;
  hotelAddress: string | null;
  roomType: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  guestName: string | null;
  bookingDate: string | null;
  bookingInterface: string | null;
  cardholderName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingZip: string | null;
  billingPhone: string | null;
  email: string | null;
  ipAddress: string | null;
  authorizationCode: string | null;
  avsResult: string | null;
  cvvResult: string | null;
  accertifyScore: string | null;
  cancellationDate: string | null;
  cancellationPolicy: string | null;
  totalAmount: number | null;
}

export interface RebuttalItem {
  id: string;
  content: string;
  pdfUrl: string | null;
  version: number;
  modelUsed: string | null;
  confidence: number | null;
  isApproved: boolean;
  createdAt: string;
}

// ─── Forms ───────────────────────────────────────────────────────────────────

export interface CaseFormData {
  caseNumber: string;
  itnNumber: string;
  reasonCode: ReasonCode;
  disputeType: DisputeType;
  portal: string;
  currency: string;
  mop: string;
  receivedDate: string;
  dueDate: string;
  disputeAmount: string;
  transactionDate: string;
  transactionAmount: string;
  reservationNumber: string;
  confirmationNumber: string;
  issuerNotes: string;
  internalNotes: string;
  // CaseDetail fields
  hotelName: string;
  hotelAddress: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  guestName: string;
  bookingDate: string;
  bookingInterface: string;
  cardholderName: string;
  billingAddress: string;
  billingCity: string;
  billingZip: string;
  billingPhone: string;
  email: string;
  ipAddress: string;
  authorizationCode: string;
  avsResult: string;
  cvvResult: string;
  cancellationDate: string;
  cancelPolicy: string;
  taxAmount: string;
  serviceFeeAmount: string;
  totalAmount: string;
}

// ─── Rebuttal engine ─────────────────────────────────────────────────────────

export interface ConditionalRule {
  condition: string;
  action: string;
}

export interface ReasonCodePattern {
  dispute_types: DisputeType[];
  core_strategy: string;
  evidence_types: string[];
  text_snippets: Record<string, string>;
  conditional_rules: ConditionalRule[];
  placeholders: string[];
  rebuttal_structure: string[];
}

export interface RebuttalContext {
  reasonCode: ReasonCode;
  merchantName: string;
  strategy: string;
  snippets: Record<string, string>;
  conditionalSnippets: string[];
  placeholders: Record<string, string>;
  structure: string[];
  evidenceTypes: string[];
}

// ─── API response shapes ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalCases: number;
  unclaimed: number;
  pending: number;
  ready: number;
  submitted: number;
  won: number;
  lost: number;
  dueToday: number;
  dueTomorrow: number;
  overdue: number;
  winRate: number;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: UserRole;
  merchantName: string;
}
