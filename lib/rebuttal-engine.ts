import type { ReasonCode, ReasonCodePattern, RebuttalContext, CaseDetailFields } from '@/types';

interface PatternsFile {
  reason_codes: Record<string, ReasonCodePattern>;
  global_snippets: Record<string, string>;
}

// Loaded at module level — never exposed to client
// eslint-disable-next-line @typescript-eslint/no-require-imports
const patterns: PatternsFile = require('../chargeback_patterns.json');

const FRAUD_CODES = new Set([
  '10.4', '37', 'AA', 'F29', '4540', '127', '193', '176',
  'U02', '6006', 'Fraud', '6014',
]);

export function isFraudCode(reasonCode: ReasonCode, bookingInterface?: string | null): boolean {
  if (FRAUD_CODES.has(reasonCode)) return true;
  // 13.7 + call_center triggers fraud email confirmation
  if (reasonCode === 'FRAUD' && bookingInterface === 'call_center') return true;
  return false;
}

export function buildRebuttalContext(
  reasonCode: ReasonCode,
  merchantName: string,
  details: Partial<CaseDetailFields> & {
    cancellationDate?: string | null;
    checkInDate?: string | null;
    guestName?: string | null;
    cardholderName?: string | null;
    avsResult?: string | null;
    cvvResult?: string | null;
    bookingInterface?: string | null;
    transactionAmount?: number | null;
    taxAmount?: number | null;
    serviceFeeAmount?: number | null;
    totalAmount?: number | null;
    confirmationNumber?: string | null;
    checkOutDate?: string | null;
  }
): RebuttalContext {
  const rcKey = toPatternKey(reasonCode);
  const pattern = patterns.reason_codes[rcKey];
  if (!pattern) throw new Error(`No pattern for reason code: ${reasonCode}`);

  const globalSnippets = injectMerchantName(patterns.global_snippets, merchantName);
  const localSnippets  = injectMerchantName(pattern.text_snippets, merchantName);
  const snippets       = { ...globalSnippets, ...localSnippets };

  const conditionalSnippets: string[] = [];
  for (const rule of pattern.conditional_rules) {
    if (evaluateCondition(rule.condition, details)) {
      conditionalSnippets.push(rule.action);
    }
  }

  const placeholders = resolvePlaceholders(pattern.placeholders, details);

  return {
    reasonCode,
    merchantName,
    strategy: pattern.core_strategy,
    snippets,
    conditionalSnippets,
    placeholders,
    structure: pattern.rebuttal_structure,
    evidenceTypes: pattern.evidence_types,
  };
}

export function assembleRebuttal(ctx: RebuttalContext): string {
  const parts: string[] = [];

  for (const section of ctx.structure) {
    const raw = ctx.snippets[section];
    if (raw) parts.push(applyPlaceholders(raw, ctx.placeholders));
  }

  if (ctx.conditionalSnippets.length > 0) {
    parts.push('\n--- Conditional Evidence ---');
    ctx.conditionalSnippets.forEach(s => parts.push(applyPlaceholders(s, ctx.placeholders)));
  }

  return parts.join('\n\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPatternKey(reasonCode: ReasonCode): string {
  const map: Record<ReasonCode, string> = {
    CANCELLED_RECURRING:      'Cancelled Recurring',
    FRAUD:                    'Fraud',
    PRODUCT_NOT_RECEIVED:     'Product Not Received',
    PRODUCT_UNSATISFACTORY:   'Product Unsatisfactory',
    TRANSACTION_AMOUNT_DIFFERS: 'Transaction Amount Differs',
  };
  return map[reasonCode];
}

function injectMerchantName(
  snippets: Record<string, string>,
  merchantName: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(snippets)) {
    result[k] = v
      .replace(/Priceline Partner Solutions/gi, merchantName)
      .replace(/Priceline/gi, merchantName);
  }
  return result;
}

function evaluateCondition(
  condition: string,
  details: Partial<CaseDetailFields> & Record<string, unknown>,
): boolean {
  const c = condition.toLowerCase();
  if (c.includes('avs') && c.includes('exact match'))
    return details.avsResult === 'M' || details.avsResult === 'Y';
  if (c.includes('cvv') && c.includes('match'))
    return details.cvvResult === 'M';
  if (c.includes('never contacted') || c.includes('never contact'))
    return !details.cancellationDate;
  if (c.includes('cancelled within penalty') || c.includes('cancel within'))
    return !!details.cancellationDate;
  if (c.includes('guest name differs'))
    return !!(details.guestName && details.cardholderName && details.guestName !== details.cardholderName);
  if (c.includes('future dated'))
    return !!(details.checkInDate && new Date(details.checkInDate) > new Date());
  if (c.includes('no proof') || c.includes('no photo'))
    return true;
  if (c.includes('hidden fees') || c.includes('hidden fee'))
    return true;
  return false;
}

function resolvePlaceholders(
  keys: string[],
  details: Partial<CaseDetailFields> & Record<string, unknown>,
): Record<string, string> {
  const map: Record<string, string> = {};
  const fmt = (d: unknown) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d as string);
    return isNaN(date.getTime()) ? String(d) : new Intl.DateTimeFormat('en-US').format(date);
  };
  const money = (v: unknown) => v != null ? `$${Number(v).toFixed(2)}` : '';

  for (const key of keys) {
    switch (key) {
      case '{hotel_name}':         map[key] = (details.hotelName as string) ?? ''; break;
      case '{guest_name}':         map[key] = (details.guestName as string) ?? ''; break;
      case '{check_in_date}':      map[key] = fmt(details.checkInDate); break;
      case '{check_out_date}':     map[key] = fmt(details.checkOutDate); break;
      case '{reservation_date}':   map[key] = fmt(details.bookingDate); break;
      case '{cancellation_date}':  map[key] = fmt(details.cancellationDate); break;
      case '{confirmation_number}':map[key] = (details.confirmationNumber as string) ?? ''; break;
      case '{avs_result}':         map[key] = (details.avsResult as string) ?? ''; break;
      case '{cvv_result}':         map[key] = (details.cvvResult as string) ?? ''; break;
      case '{total_amount}':       map[key] = money(details.totalAmount); break;
      case '{tax_amount}':         map[key] = money(details.taxAmount); break;
      case '{service_fee_amount}': map[key] = money(details.serviceFeeAmount); break;
    }
  }
  return map;
}

function applyPlaceholders(text: string, map: Record<string, string>): string {
  return text.replace(/\{[^}]+\}/g, token => map[token] ?? token);
}
