'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
] as const;

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-navy-900/95 backdrop-blur-md border-b border-navy-800'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-white font-black text-lg tracking-tight">
            Rebuttal Engine
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#7A95A5] hover:text-white transition-colors duration-150 text-sm font-semibold uppercase tracking-widest"
                style={{ fontSize: '10px', letterSpacing: '2px' }}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="btn-primary py-2.5 px-5">
              Sign In
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className="lg:hidden overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: menuOpen ? '320px' : '0px' }}
      >
        <div className="bg-navy-900/98 backdrop-blur-md border-t border-navy-800 px-4 sm:px-6 py-6 flex flex-col gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-[#7A95A5] hover:text-white transition-colors duration-150 font-extrabold uppercase tracking-widest"
              style={{ fontSize: '10px', letterSpacing: '2.5px' }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="btn-primary self-start"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-navy-900 border-t border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 3-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="text-white font-black text-lg tracking-tight block mb-4">
              Rebuttal Engine
            </Link>
            <p className="text-[#7A95A5] text-sm leading-relaxed max-w-xs">
              AI-powered chargeback rebuttal automation for merchant dispute teams. Generate bank-ready letters in seconds.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="section-label mb-4">Product</p>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'Features', href: '/features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Sign In', href: '/login' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[#7A95A5] hover:text-gold-400 transition-colors duration-150 text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="section-label mb-4">Platform</p>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'RCA Manager', href: '/login' },
                { label: 'Dashboard', href: '/login' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[#7A95A5] hover:text-gold-400 transition-colors duration-150 text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-px bg-gold-500 mt-12 mb-8 opacity-30" />

        {/* Copyright */}
        <p className="text-[#7A95A5] text-xs uppercase tracking-widest" style={{ letterSpacing: '2px' }}>
          &copy; {new Date().getFullYear()} Rebuttal Engine. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
