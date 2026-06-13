import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: { default: 'Rebuttal Engine', template: '%s — Rebuttal Engine' },
  description: 'Dispute rebuttal automation for merchant teams. Generate bank-ready chargeback responses in seconds.',
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  openGraph: {
    siteName: 'Rebuttal Engine',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
