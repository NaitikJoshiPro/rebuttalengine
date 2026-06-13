'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CaseFormData, ReasonCode, DisputeType } from '@/types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const REASON_CODES = ['CANCELLED_RECURRING', 'FRAUD', 'PRODUCT_NOT_RECEIVED', 'PRODUCT_UNSATISFACTORY', 'TRANSACTION_AMOUNT_DIFFERS'] as const;
const DISPUTE_TYPES = ['CB', 'INQ', 'PRE'] as const;

const caseSchema = z.object({
  // Step 1
  caseNumber:         z.string().min(1, 'Required'),
  itnNumber:          z.string().min(1, 'Required'),
  reasonCode:         z.enum(REASON_CODES, { required_error: 'Required' }),
  disputeType:        z.enum(DISPUTE_TYPES, { required_error: 'Required' }),
  portal:             z.string().min(1, 'Required'),
  currency:           z.string().min(1, 'Required').default('USD'),
  receivedDate:       z.string().min(1, 'Required'),
  dueDate:            z.string().min(1, 'Required'),
  disputeAmount:      z.string().min(1, 'Required'),
  // Step 2
  transactionDate:    z.string().optional().default(''),
  transactionAmount:  z.string().optional().default(''),
  reservationNumber:  z.string().optional().default(''),
  confirmationNumber: z.string().optional().default(''),
  mop:                z.string().optional().default(''),
  taxAmount:          z.string().optional().default(''),
  serviceFeeAmount:   z.string().optional().default(''),
  // Step 3
  hotelName:          z.string().optional().default(''),
  hotelAddress:       z.string().optional().default(''),
  guestName:          z.string().optional().default(''),
  checkInDate:        z.string().optional().default(''),
  checkOutDate:       z.string().optional().default(''),
  roomType:           z.string().optional().default(''),
  bookingInterface:   z.string().optional().default(''),
  bookingDate:        z.string().optional().default(''),
  // Step 4
  cardholderName:     z.string().optional().default(''),
  billingAddress:     z.string().optional().default(''),
  billingCity:        z.string().optional().default(''),
  billingZip:         z.string().optional().default(''),
  billingPhone:       z.string().optional().default(''),
  email:              z.string().optional().default(''),
  ipAddress:          z.string().optional().default(''),
  authorizationCode:  z.string().optional().default(''),
  avsResult:          z.string().optional().default(''),
  cvvResult:          z.string().optional().default(''),
  cancellationDate:   z.string().optional().default(''),
  cancelPolicy:       z.string().optional().default(''),
  internalNotes:      z.string().optional().default(''),
  issuerNotes:        z.string().optional().default(''),
  totalAmount:        z.string().optional().default(''),
});

type FormValues = z.infer<typeof caseSchema>;

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Case Basics' },
  { id: 2, label: 'Transaction Data' },
  { id: 3, label: 'Guest & Hotel' },
  { id: 4, label: 'Cardholder & Signals' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="form-required">*</span>}
      </label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: done ? '#059669' : active ? '#B8953A' : '#e5e7eb',
                  color: done || active ? 'white' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {done ? '✓' : step.id}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginTop: 4,
                  color: active ? '#B8953A' : done ? '#059669' : '#9ca3af',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                style={{
                  height: 2,
                  width: 48,
                  backgroundColor: done ? '#059669' : '#e5e7eb',
                  marginBottom: 20,
                  marginLeft: 4,
                  marginRight: 4,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function NewCasePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      currency: 'USD',
      disputeType: 'CB',
    },
  });

  // Fields per step for partial validation
  type FieldName = keyof FormValues;
  const STEP_FIELDS: Record<number, FieldName[]> = {
    1: ['caseNumber', 'itnNumber', 'reasonCode', 'disputeType', 'portal', 'currency', 'receivedDate', 'dueDate', 'disputeAmount'],
    2: ['transactionDate', 'transactionAmount', 'reservationNumber', 'confirmationNumber', 'mop', 'taxAmount', 'serviceFeeAmount'],
    3: ['hotelName', 'guestName', 'checkInDate', 'checkOutDate', 'roomType', 'bookingInterface', 'bookingDate'],
    4: ['cardholderName', 'billingAddress', 'billingCity', 'billingZip', 'billingPhone', 'email', 'ipAddress', 'authorizationCode', 'avsResult', 'cvvResult', 'cancellationDate', 'cancelPolicy', 'internalNotes', 'issuerNotes'],
  };

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to create case');
      }
      const result = await res.json() as { data: { id: string } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/rca/${result.data.id}` as any);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Breadcrumb */}
      <p
        className="mb-4"
        style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af' }}
      >
        RCA Manager &rsaquo; New Case
      </p>

      <h1 className="text-navy-900 font-900 text-2xl mb-8">New Case</h1>

      <StepIndicator current={step} />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Step 1: Case Basics ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white border border-gray-100 p-6">
            <h2
              style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8953A', marginBottom: 20 }}
            >
              Case Basics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Case Number" required error={errors.caseNumber?.message}>
                <input {...register('caseNumber')} className={`form-input${errors.caseNumber ? ' error' : ''}`} placeholder="CB-2024-001" />
              </Field>
              <Field label="ITN Number" required error={errors.itnNumber?.message}>
                <input {...register('itnNumber')} className={`form-input${errors.itnNumber ? ' error' : ''}`} placeholder="ITN-12345678" />
              </Field>
              <Field label="Reason Code" required error={errors.reasonCode?.message}>
                <select {...register('reasonCode')} className={`form-input${errors.reasonCode ? ' error' : ''}`}>
                  <option value="">Select reason code…</option>
                  {REASON_CODES.map((rc) => (
                    <option key={rc} value={rc}>{rc.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </Field>
              <Field label="Dispute Type" required error={errors.disputeType?.message}>
                <select {...register('disputeType')} className={`form-input${errors.disputeType ? ' error' : ''}`}>
                  <option value="CB">CB — Chargeback</option>
                  <option value="INQ">INQ — Inquiry</option>
                  <option value="PRE">PRE — Pre-arbitration</option>
                </select>
              </Field>
              <Field label="Portal" required error={errors.portal?.message}>
                <input {...register('portal')} className={`form-input${errors.portal ? ' error' : ''}`} placeholder="e.g. Amex, Chase" />
              </Field>
              <Field label="Currency" required error={errors.currency?.message}>
                <input {...register('currency')} className={`form-input${errors.currency ? ' error' : ''}`} placeholder="USD" defaultValue="USD" />
              </Field>
              <Field label="Received Date" required error={errors.receivedDate?.message}>
                <input type="date" {...register('receivedDate')} className={`form-input${errors.receivedDate ? ' error' : ''}`} />
              </Field>
              <Field label="Due Date" required error={errors.dueDate?.message}>
                <input type="date" {...register('dueDate')} className={`form-input${errors.dueDate ? ' error' : ''}`} />
              </Field>
              <Field label="Dispute Amount" required error={errors.disputeAmount?.message} >
                <input {...register('disputeAmount')} className={`form-input${errors.disputeAmount ? ' error' : ''}`} placeholder="0.00" />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 2: Transaction Data ──────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white border border-gray-100 p-6">
            <h2
              style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8953A', marginBottom: 20 }}
            >
              Transaction Data
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Transaction Date" error={errors.transactionDate?.message}>
                <input type="date" {...register('transactionDate')} className="form-input" />
              </Field>
              <Field label="Transaction Amount" error={errors.transactionAmount?.message}>
                <input {...register('transactionAmount')} className="form-input" placeholder="0.00" />
              </Field>
              <Field label="Reservation Number" error={errors.reservationNumber?.message}>
                <input {...register('reservationNumber')} className="form-input" />
              </Field>
              <Field label="Confirmation Number" error={errors.confirmationNumber?.message}>
                <input {...register('confirmationNumber')} className="form-input" />
              </Field>
              <Field label="Method of Payment" error={errors.mop?.message}>
                <input {...register('mop')} className="form-input" placeholder="Visa, MC, Amex…" />
              </Field>
              <Field label="Tax Amount" error={errors.taxAmount?.message}>
                <input {...register('taxAmount')} className="form-input" placeholder="0.00" />
              </Field>
              <Field label="Service Fee Amount" error={errors.serviceFeeAmount?.message}>
                <input {...register('serviceFeeAmount')} className="form-input" placeholder="0.00" />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 3: Guest & Hotel ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white border border-gray-100 p-6">
            <h2
              style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8953A', marginBottom: 20 }}
            >
              Guest & Hotel
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hotel Name" error={errors.hotelName?.message}>
                <input {...register('hotelName')} className="form-input" />
              </Field>
              <Field label="Guest Name" error={errors.guestName?.message}>
                <input {...register('guestName')} className="form-input" />
              </Field>
              <Field label="Check-In Date" error={errors.checkInDate?.message}>
                <input type="date" {...register('checkInDate')} className="form-input" />
              </Field>
              <Field label="Check-Out Date" error={errors.checkOutDate?.message}>
                <input type="date" {...register('checkOutDate')} className="form-input" />
              </Field>
              <Field label="Room Type" error={errors.roomType?.message}>
                <input {...register('roomType')} className="form-input" placeholder="King, Double…" />
              </Field>
              <Field label="Booking Interface" error={errors.bookingInterface?.message}>
                <select {...register('bookingInterface')} className="form-input">
                  <option value="">Select…</option>
                  <option value="web">Web</option>
                  <option value="call_center">Call Center</option>
                  <option value="mobile">Mobile App</option>
                  <option value="api">API</option>
                </select>
              </Field>
              <Field label="Booking Date" error={errors.bookingDate?.message}>
                <input type="date" {...register('bookingDate')} className="form-input" />
              </Field>
              <Field label="Hotel Address" error={errors.hotelAddress?.message}>
                <input {...register('hotelAddress')} className="form-input" />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 4: Cardholder & Signals ─────────────────────────────── */}
        {step === 4 && (
          <div className="bg-white border border-gray-100 p-6">
            <h2
              style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B8953A', marginBottom: 20 }}
            >
              Cardholder & Fraud Signals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cardholder Name" error={errors.cardholderName?.message}>
                <input {...register('cardholderName')} className="form-input" />
              </Field>
              <Field label="Billing Address" error={errors.billingAddress?.message}>
                <input {...register('billingAddress')} className="form-input" />
              </Field>
              <Field label="Billing City" error={errors.billingCity?.message}>
                <input {...register('billingCity')} className="form-input" />
              </Field>
              <Field label="Billing ZIP" error={errors.billingZip?.message}>
                <input {...register('billingZip')} className="form-input" />
              </Field>
              <Field label="Billing Phone" error={errors.billingPhone?.message}>
                <input type="tel" {...register('billingPhone')} className="form-input" />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input type="email" {...register('email')} className="form-input" />
              </Field>
              <Field label="IP Address" error={errors.ipAddress?.message}>
                <input {...register('ipAddress')} className="form-input" placeholder="192.168.0.1" />
              </Field>
              <Field label="Authorization Code" error={errors.authorizationCode?.message}>
                <input {...register('authorizationCode')} className="form-input" />
              </Field>
              <Field label="AVS Result" error={errors.avsResult?.message}>
                <input {...register('avsResult')} className="form-input" placeholder="Y, N, U…" />
              </Field>
              <Field label="CVV Result" error={errors.cvvResult?.message}>
                <input {...register('cvvResult')} className="form-input" placeholder="M, N, P…" />
              </Field>
              <Field label="Cancellation Date" error={errors.cancellationDate?.message}>
                <input type="date" {...register('cancellationDate')} className="form-input" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Cancellation Policy" error={errors.cancelPolicy?.message}>
                  <textarea {...register('cancelPolicy')} className="form-input" rows={3} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Issuer Notes" error={errors.issuerNotes?.message}>
                  <textarea {...register('issuerNotes')} className="form-input" rows={2} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Internal Notes" error={errors.internalNotes?.message}>
                  <textarea {...register('internalNotes')} className="form-input" rows={2} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="btn-secondary"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {serverError && (
              <p className="text-red-500 text-xs font-600">{serverError}</p>
            )}
            {step < 4 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Create Case'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
