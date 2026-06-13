import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ClipboardList,
  Zap,
  Users,
  Shield,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Explore every capability of Rebuttal Engine — from AI-driven rebuttal generation to multi-team RBAC, evidence management, and a complete audit trail.',
};

// ─── Feature section data ─────────────────────────────────────────────────────
const FEATURE_SECTIONS = [
  {
    id: 'rca-manager',
    label: 'Root Cause Analysis',
    icon: ClipboardList,
    title: 'RCA Manager',
    description:
      'Stop reacting to chargebacks and start preventing them. The RCA Manager gives your team a structured workspace to categorise dispute triggers, tag related cases, and surface recurring patterns before they become a liability.',
    bullets: [
      'Categorise disputes by reason code, product line, and time period',
      'Spot high-frequency root causes with built-in trend charts',
      'Link RCA findings directly to rebuttal templates for faster drafting',
      'Share findings across teams with read-only review access',
    ],
    layout: 'image-right' as const,
    dark: false,
  },
  {
    id: 'ai-generation',
    label: 'AI Generation Pipeline',
    icon: Zap,
    title: 'AI Rebuttal Generation',
    description:
      'The generation pipeline ingests your case data, maps it to the relevant card network rules, and produces a structured, bank-ready letter — in under 30 seconds. No template hunting, no copy-paste errors.',
    bullets: [
      'Supports Visa, Mastercard, and Amex dispute frameworks',
      'Adapts argument strategy based on reason code and transaction history',
      'Highlights the strongest evidence points automatically',
      'Lets analysts review and edit before finalising',
    ],
    layout: 'image-left' as const,
    dark: true,
  },
  {
    id: 'rbac',
    label: 'Access Control',
    icon: Users,
    title: 'RBAC & Multi-Team',
    description:
      'Enterprise-grade role-based access control designed for how dispute teams actually work. Analysts draft, supervisors review, admins configure — everyone stays in their lane without constant permission requests.',
    bullets: [
      'Three built-in roles: Analyst, Reviewer, Admin — plus custom roles',
      'Team-level data isolation for BPO and multi-brand setups',
      'Invite members via email with configurable access expiry',
      'Full permission matrix visible to admins at a glance',
    ],
    layout: 'image-right' as const,
    dark: false,
  },
  {
    id: 'evidence-audit',
    label: 'Evidence & Compliance',
    icon: Shield,
    title: 'Evidence Library & Audit Trail',
    description:
      'A centralised evidence store paired with an immutable audit log means your team always has what it needs and can always prove what it did. Built for internal compliance and bank submission requirements alike.',
    bullets: [
      'Upload screenshots, PDFs, and transaction exports in any format',
      'Attach evidence packages directly to rebuttal letters',
      'Immutable log of every create, edit, review, and export action',
      'Export audit logs as CSV for external compliance reporting',
    ],
    layout: 'image-left' as const,
    dark: true,
  },
];

// ─── Hero stats ───────────────────────────────────────────────────────────────
const STATS = [
  { value: '< 30s', label: 'Average generation time' },
  { value: '5', label: 'Dispute types supported' },
  { value: '100%', label: 'Vercel-native deployment' },
  { value: 'SOC 2', label: 'Ready architecture' },
];

export default function FeaturesPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="hero-bg pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="section-label">Platform Overview</p>
            <div className="gold-divider" />
            <h1
              className="text-white font-black leading-tight mb-6"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
            >
              Built for Dispute Teams That Can&apos;t Afford to Lose
            </h1>
            <p className="text-[#7A95A5] text-lg leading-relaxed max-w-2xl mb-10">
              Every feature in Rebuttal Engine was designed around a single principle: give analysts the tools to generate compelling, accurate, bank-ready responses without the overhead of manual drafting.
            </p>
            <Link href="/login" className="btn-primary">
              Start Free Trial
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px bg-navy-800">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-navy-900 px-6 py-8">
                <p className="text-white font-black text-3xl mb-1">{stat.value}</p>
                <p className="text-[#7A95A5] text-xs uppercase tracking-widest" style={{ letterSpacing: '1.5px' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE SECTIONS ─────────────────────────────────────────────────── */}
      {FEATURE_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isImageLeft = section.layout === 'image-left';

        return (
          <section
            key={section.id}
            id={section.id}
            className={`py-24 lg:py-36 ${section.dark ? 'dark-section-bg' : 'bg-cream'}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={`flex flex-col lg:flex-row gap-16 lg:gap-24 items-center ${
                  isImageLeft ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-5">
                    <Icon size={18} className="text-gold-500" />
                    <p className="section-label">{section.label}</p>
                  </div>
                  <div className="gold-divider" />
                  <h2
                    className={`font-black leading-tight mb-5 ${
                      section.dark ? 'text-white' : 'text-navy-900'
                    }`}
                    style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
                  >
                    {section.title}
                  </h2>
                  <p
                    className={`text-base leading-relaxed mb-8 ${
                      section.dark ? 'text-[#7A95A5]' : 'text-gray-500'
                    }`}
                  >
                    {section.description}
                  </p>
                  <ul className="flex flex-col gap-3 mb-10">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <CheckCircle
                          size={16}
                          className="text-gold-500 mt-0.5 flex-shrink-0"
                        />
                        <span
                          className={`text-sm leading-relaxed ${
                            section.dark ? 'text-[#7A95A5]' : 'text-gray-600'
                          }`}
                        >
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`inline-flex items-center gap-2 font-extrabold uppercase tracking-widest text-gold-500 hover:text-gold-400 transition-colors duration-150`}
                    style={{ fontSize: '10px', letterSpacing: '2px' }}
                  >
                    Get Started <ArrowRight size={14} />
                  </Link>
                </div>

                {/* Visual panel */}
                <div className="flex-1 w-full">
                  <div
                    className={`border ${
                      section.dark
                        ? 'border-navy-700 bg-navy-800'
                        : 'border-gray-200 bg-white'
                    } p-8`}
                  >
                    {/* Abstract feature illustration */}
                    <div className="flex items-center gap-2 mb-6">
                      <Icon size={16} className="text-gold-500" />
                      <span
                        className={`font-extrabold uppercase tracking-widest ${
                          section.dark ? 'text-white' : 'text-navy-900'
                        }`}
                        style={{ fontSize: '10px', letterSpacing: '2px' }}
                      >
                        {section.title}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {section.bullets.map((bullet, i) => (
                        <div
                          key={bullet}
                          className={`flex items-center gap-3 p-3 border ${
                            section.dark
                              ? 'border-navy-700 bg-navy-900'
                              : 'border-gray-100 bg-parchment'
                          }`}
                        >
                          <div
                            className="w-5 h-5 flex-shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(184,149,58,0.15)' }}
                          >
                            <span className="text-gold-500 font-black" style={{ fontSize: '9px' }}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <p
                            className={`text-xs leading-relaxed ${
                              section.dark ? 'text-[#7A95A5]' : 'text-gray-600'
                            }`}
                          >
                            {bullet}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="compliance-bg py-24 lg:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-3">Start Today</p>
          <div className="gold-divider mx-auto" />
          <h2 className="text-white font-black text-4xl lg:text-5xl leading-tight mb-6">
            See Every Feature in Action
          </h2>
          <p className="text-[#7A95A5] text-lg mb-10 max-w-lg mx-auto">
            No credit card required. Get full access to all features on the Starter plan and upgrade when your volume demands it.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/login" className="btn-primary">
              Start Free Trial
            </Link>
            <Link href="/pricing" className="btn-secondary">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
