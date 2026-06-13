import Link from 'next/link';
import {
  Clock,
  Layers,
  Server,
  FileX,
  AlertTriangle,
  FolderOpen,
  ClipboardList,
  Zap,
  Users,
  BookOpen,
  Download,
  Shield,
} from 'lucide-react';

// ─── Hero metrics ────────────────────────────────────────────────────────────
const METRICS = [
  { value: '< 30s', label: 'Generation Time', icon: Clock },
  { value: '5', label: 'Dispute Types Covered', icon: Layers },
  { value: '100%', label: 'Vercel-Native Infrastructure', icon: Server },
  { value: 'Zero', label: 'Google Sheets Required', icon: FileX },
];

// ─── Pain points ─────────────────────────────────────────────────────────────
const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    title: 'Manual Rebuttal Drafting',
    body: 'Analysts spend hours copy-pasting case data into templates, introducing errors and burning time that could be spent reviewing new disputes.',
  },
  {
    icon: FolderOpen,
    title: 'Scattered Evidence',
    body: 'Supporting documents live in email threads, shared drives, and ticketing systems — making it nearly impossible to build a coherent rebuttal package.',
  },
  {
    icon: ClipboardList,
    title: 'No Audit Trail',
    body: 'Without version history or decision logs, teams cannot demonstrate due diligence to acquiring banks or comply with internal review requirements.',
  },
];

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
  {
    number: '01',
    title: 'Enter Case Data',
    body: 'Input the transaction details, dispute reason code, and any relevant customer history. Our structured form guides you through every required field.',
  },
  {
    number: '02',
    title: 'AI Generates Rebuttal',
    body: 'The engine analyzes your case against known chargeback patterns and produces a bank-ready rebuttal letter tailored to the dispute type and card network rules.',
  },
  {
    number: '03',
    title: 'Export & Submit',
    body: 'Download a formatted PDF, attach your evidence library, and submit directly to your acquiring bank — all from a single workflow.',
  },
];

// ─── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: ClipboardList,
    title: 'RCA Manager',
    body: 'Track root cause analysis for each dispute category. Identify systemic issues and reduce future chargeback rates with trend reporting.',
  },
  {
    icon: Zap,
    title: 'AI Rebuttal Generation',
    body: 'Context-aware letter generation trained on dispute patterns. Produces compelling, evidence-backed arguments formatted for bank compliance.',
  },
  {
    icon: Users,
    title: 'RBAC & Multi-Team',
    body: 'Role-based access control with team-level isolation. Analysts, reviewers, and admins each get exactly the permissions they need.',
  },
  {
    icon: BookOpen,
    title: 'Evidence Library',
    body: 'Centralised storage for screenshots, transaction records, and policy documents. Attach evidence directly to rebuttals without leaving the platform.',
  },
  {
    icon: Download,
    title: 'PDF Export',
    body: 'One-click export of polished rebuttal letters with your organisation\'s letterhead, case metadata, and attached evidence in a single package.',
  },
  {
    icon: Shield,
    title: 'Audit Trail',
    body: 'Immutable log of every action — who drafted, reviewed, and submitted each rebuttal. Built-in compliance documentation for internal and external audits.',
  },
];

// ─── Dispute types ────────────────────────────────────────────────────────────
const DISPUTE_TYPES = [
  'Cancelled Recurring',
  'Fraud',
  'Product Not Received',
  'Product Unsatisfactory',
  'Transaction Amount Differs',
];

export default function HomePage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="hero-bg min-h-screen flex flex-col justify-center pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <p className="section-label animate-fade-in">Dispute Resolution, Automated</p>
            <div className="gold-divider animate-fade-in" style={{ animationDelay: '0.05s' }} />

            <h1
              className="text-white font-black leading-[1.05] mb-6 animate-fade-in-up"
              style={{
                fontSize: 'clamp(2.6rem, 6vw, 5rem)',
                animationDelay: '0.1s',
              }}
            >
              Generate Winning Rebuttals in Seconds
            </h1>

            <p
              className="mb-10 font-normal leading-relaxed max-w-xl animate-fade-in-up"
              style={{
                fontSize: '18px',
                color: '#7A95A5',
                animationDelay: '0.18s',
              }}
            >
              AI-powered chargeback rebuttal engine that turns case data into bank-ready letters.
              Built for dispute analysts who need speed and precision.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: '0.26s' }}>
              <Link href="/register" className="btn-primary">
                Start Free Trial
              </Link>
              <Link href="/features" className="btn-secondary">
                See How It Works
              </Link>
            </div>
          </div>

          {/* Metric cards */}
          <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="card-dark animate-fade-in-up"
                  style={{ animationDelay: `${0.32 + i * 0.08}s` }}
                >
                  <Icon size={18} className="text-gold-500 mb-4" />
                  <p className="text-white font-black text-2xl mb-1">{metric.value}</p>
                  <p className="text-[#7A95A5] text-xs uppercase tracking-widest" style={{ letterSpacing: '1.5px' }}>
                    {metric.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Gold separator */}
          <div className="h-px bg-gold-500 mt-16 opacity-20" />
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────────────── */}
      <section className="bg-cream py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-14">
            <p className="section-label">The Problem</p>
            <div className="gold-divider" />
            <h2 className="text-navy-900 font-black text-4xl lg:text-5xl leading-tight">
              Manual Disputes Cost You More Than Time
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PAIN_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="card-light">
                  <Icon size={20} className="text-gold-500 mb-5" />
                  <h3 className="text-navy-900 font-black text-lg mb-3">{point.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{point.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="bg-cream border-t border-gray-100 py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-14">
            <p className="section-label">How It Works</p>
            <div className="gold-divider" />
            <h2 className="text-navy-900 font-black text-4xl lg:text-5xl leading-tight">
              Three Steps to a Winning Response
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="card-light relative">
                <p
                  className="font-black text-gray-100 select-none absolute top-6 right-6"
                  style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1 }}
                  aria-hidden="true"
                >
                  {step.number}
                </p>
                <p className="text-gold-500 font-black text-sm mb-3 uppercase tracking-widest" style={{ letterSpacing: '2px' }}>
                  Step {step.number}
                </p>
                <h3 className="text-navy-900 font-black text-xl mb-3 leading-snug">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className="dark-section-bg py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-14">
            <p className="section-label">Platform Features</p>
            <div className="gold-divider" />
            <h2 className="text-white font-black text-4xl lg:text-5xl leading-tight">
              Everything Your Team Needs
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="card-dark">
                  <Icon size={20} className="text-gold-500 mb-5" />
                  <h3 className="text-white font-black text-lg mb-3">{feature.title}</h3>
                  <p className="text-[#7A95A5] text-sm leading-relaxed">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DISPUTE TYPES ────────────────────────────────────────────────────── */}
      <section className="bg-cream py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-14 mx-auto text-center">
            <h2 className="text-navy-900 font-black text-4xl lg:text-5xl leading-tight">
              Every Dispute Type, Handled
            </h2>
            <p className="text-gray-500 mt-4 text-sm leading-relaxed">
              Rebuttal Engine supports all major chargeback reason categories out of the box, with tailored letter logic for each one.
            </p>
          </div>

          {/* Horizontal scroll on small, grid on lg */}
          <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 lg:grid lg:grid-cols-5 lg:overflow-x-visible">
            {DISPUTE_TYPES.map((type) => (
              <div
                key={type}
                className="flex-shrink-0 border border-gold-500/30 bg-white px-6 py-5 text-center"
                style={{ minWidth: '180px' }}
              >
                <div className="w-2 h-2 bg-gold-500 mx-auto mb-3" />
                <p className="text-navy-900 font-black text-sm leading-snug">{type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="compliance-bg py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-3">Get Started Today</p>
          <div className="gold-divider mx-auto" />
          <h2 className="text-white font-black text-4xl lg:text-5xl leading-tight mb-8">
            Ready to Win More Chargebacks?
          </h2>
          <p className="text-[#7A95A5] text-lg mb-10 max-w-lg mx-auto">
            Join dispute teams who have cut rebuttal time from hours to seconds. No credit card required.
          </p>
          <Link href="/register" className="btn-primary">
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
