'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle, Minus, ChevronDown } from 'lucide-react';

// ─── Plan data ────────────────────────────────────────────────────────────────
type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  ctaHref: string;
  featured: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For individual analysts or small teams evaluating the platform.',
    cta: 'Get Started Free',
    ctaHref: '/register',
    featured: false,
    features: [
      'Up to 50 cases per month',
      'AI rebuttal generation',
      '5 dispute type templates',
      'Evidence uploads (500 MB)',
      'PDF export',
      'Single user',
    ],
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/mo',
    description: 'For growing dispute teams that need volume and collaboration.',
    cta: 'Start Professional Trial',
    ctaHref: '/register?plan=professional',
    featured: true,
    features: [
      'Up to 500 cases per month',
      'AI rebuttal generation (priority)',
      '5 dispute type templates',
      'Evidence uploads (10 GB)',
      'PDF export with letterhead',
      'Up to 10 team members',
      'RBAC (Analyst & Reviewer roles)',
      'RCA Manager',
      'Audit trail (90 days)',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large merchant teams with complex compliance and volume needs.',
    cta: 'Contact Sales',
    ctaHref: '/contact',
    featured: false,
    features: [
      'Unlimited cases',
      'AI generation (dedicated throughput)',
      'Custom dispute type templates',
      'Unlimited evidence storage',
      'PDF export with custom branding',
      'Unlimited team members',
      'Full RBAC with custom roles',
      'RCA Manager + trend reporting',
      'Audit trail (unlimited retention)',
      'SSO / SAML integration',
      'Dedicated onboarding & support',
      'SLA guarantee',
    ],
  },
];

// ─── Comparison table ─────────────────────────────────────────────────────────
type ComparisonRow = {
  feature: string;
  starter: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
};

const COMPARISON: ComparisonRow[] = [
  { feature: 'Cases per month', starter: '50', professional: '500', enterprise: 'Unlimited' },
  { feature: 'AI rebuttal generation', starter: true, professional: true, enterprise: true },
  { feature: 'Dispute type templates', starter: '5 templates', professional: '5 templates', enterprise: 'Custom' },
  { feature: 'PDF export', starter: true, professional: true, enterprise: true },
  { feature: 'Letterhead & branding', starter: false, professional: true, enterprise: true },
  { feature: 'Evidence storage', starter: '500 MB', professional: '10 GB', enterprise: 'Unlimited' },
  { feature: 'Team members', starter: '1', professional: '10', enterprise: 'Unlimited' },
  { feature: 'Role-based access (RBAC)', starter: false, professional: true, enterprise: true },
  { feature: 'Custom roles', starter: false, professional: false, enterprise: true },
  { feature: 'RCA Manager', starter: false, professional: true, enterprise: true },
  { feature: 'Audit trail', starter: false, professional: '90 days', enterprise: 'Unlimited' },
  { feature: 'SSO / SAML', starter: false, professional: false, enterprise: true },
  { feature: 'Dedicated support', starter: false, professional: false, enterprise: true },
  { feature: 'SLA guarantee', starter: false, professional: false, enterprise: true },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
type FaqItem = { q: string; a: string };

const FAQ: FaqItem[] = [
  {
    q: 'What counts as a "case"?',
    a: 'A case is one chargeback dispute submitted to the platform, regardless of how many times the rebuttal is revised or exported. Cases reset on your monthly billing cycle.',
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades take effect at the start of the next billing period.',
  },
  {
    q: 'Is my dispute data kept confidential?',
    a: 'All case data is encrypted at rest (AES-256) and in transit (TLS 1.3). We never use your dispute data to train AI models. Enterprise customers can request a data processing agreement.',
  },
  {
    q: 'What card networks are supported?',
    a: 'The AI generation pipeline currently supports Visa, Mastercard, and American Express dispute frameworks. Additional networks are on the roadmap.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes. Annual billing is available on Professional and Enterprise plans at a 20% discount versus monthly. Contact sales for annual Enterprise pricing.',
  },
  {
    q: 'How does the free Starter plan work?',
    a: 'Starter is free indefinitely with no credit card required. You get full access to AI rebuttal generation and PDF export for up to 50 cases per month. Upgrade when you need more volume or team collaboration.',
  },
];

// ─── FAQ accordion item ───────────────────────────────────────────────────────
function FaqItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-navy-900 font-black text-base pr-6">{item.q}</span>
        <ChevronDown
          size={18}
          className={`text-gold-500 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '400px' : '0px' }}
      >
        <p className="text-gray-500 text-sm leading-relaxed pb-5">{item.a}</p>
      </div>
    </div>
  );
}

// ─── Comparison cell ──────────────────────────────────────────────────────────
function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <CheckCircle size={16} className="text-gold-500 mx-auto" />;
  }
  if (value === false) {
    return <Minus size={16} className="text-gray-300 mx-auto" />;
  }
  return <span className="text-navy-900 text-sm font-semibold">{value}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="hero-bg pt-32 pb-24 lg:pt-40 lg:pb-32 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label">Transparent Pricing</p>
          <div className="gold-divider mx-auto" />
          <h1
            className="text-white font-black leading-tight mb-4"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
          >
            Start Free, Scale as You Win
          </h1>
          <p className="text-[#7A95A5] text-lg max-w-xl mx-auto">
            No credit card required on Starter. Upgrade when your team or case volume demands it.
          </p>
        </div>
      </section>

      {/* ── PRICING CARDS ────────────────────────────────────────────────────── */}
      <section className="bg-cream py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-gray-200">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col p-8 border-r border-gray-200 last:border-r-0 ${
                  plan.featured ? 'pricing-featured bg-navy-900' : 'bg-white'
                }`}
                style={
                  plan.featured
                    ? { boxShadow: '0 0 0 2px #B8953A, 0 8px 32px rgba(184,149,58,0.18)' }
                    : {}
                }
              >
                {plan.featured && (
                  <div className="badge badge-gold mb-4 self-start">Most Popular</div>
                )}
                <p
                  className={`font-black text-sm uppercase tracking-widest mb-2 ${
                    plan.featured ? 'text-gold-400' : 'text-navy-700'
                  }`}
                  style={{ letterSpacing: '2px' }}
                >
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-3">
                  <span
                    className={`font-black leading-none ${
                      plan.featured ? 'text-white' : 'text-navy-900'
                    }`}
                    style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm mb-1 ${plan.featured ? 'text-[#7A95A5]' : 'text-gray-400'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed mb-8 ${plan.featured ? 'text-[#7A95A5]' : 'text-gray-500'}`}>
                  {plan.description}
                </p>

                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle
                        size={14}
                        className="text-gold-500 mt-0.5 flex-shrink-0"
                      />
                      <span
                        className={`text-sm ${plan.featured ? 'text-[#7A95A5]' : 'text-gray-600'}`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={plan.featured ? 'btn-primary' : 'btn-secondary'}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────────────────────────── */}
      <section className="bg-parchment py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-12">
            <p className="section-label">Plan Comparison</p>
            <div className="gold-divider" />
            <h2 className="text-navy-900 font-black text-4xl leading-tight">
              Feature by Feature
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '35%' }}>Feature</th>
                  <th className="text-center">Starter</th>
                  <th className="text-center bg-navy-800">Professional</th>
                  <th className="text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <td className="font-medium text-navy-900">{row.feature}</td>
                    <td className="text-center">
                      <ComparisonCell value={row.starter} />
                    </td>
                    <td className="text-center bg-gold-50">
                      <ComparisonCell value={row.professional} />
                    </td>
                    <td className="text-center">
                      <ComparisonCell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="bg-cream py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-12">
            <p className="section-label">FAQ</p>
            <div className="gold-divider" />
            <h2 className="text-navy-900 font-black text-4xl leading-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl">
            {FAQ.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="compliance-bg py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-3">No Risk</p>
          <div className="gold-divider mx-auto" />
          <h2 className="text-white font-black text-4xl lg:text-5xl leading-tight mb-6">
            Start Winning Disputes Today
          </h2>
          <p className="text-[#7A95A5] text-lg mb-10 max-w-lg mx-auto">
            Free plan, no credit card required. Upgrade to Professional when you&apos;re ready for team collaboration and higher volume.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn-primary">
              Get Started Free
            </Link>
            <Link href="/contact" className="btn-secondary">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
