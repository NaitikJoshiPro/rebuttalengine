import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import {
  LayoutDashboard,
  FolderOpen,
  FileStack,
  BarChart3,
  Settings,
  ShieldCheck,
  Bell,
  LogOut,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { hasPermission } from '@/types';

// ─── Sidebar nav link (server-rendered) ──────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link href={href as any} className="sidebar-link">
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  );
}

// ─── User avatar initials ─────────────────────────────────────────────────────

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 bg-gold-500 text-white"
      style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1 }}
      aria-label={name}
    >
      {initials}
    </span>
  );
}

// ─── Portal layout ────────────────────────────────────────────────────────────

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = session.user as {
    id: string;
    name: string;
    email: string;
    orgId: string;
    orgName: string;
    role: UserRole;
  };

  const isManagerPlus = hasPermission(user.role, 'MANAGER');
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col h-screen sticky top-0 bg-navy-900 shrink-0"
        style={{ width: 220 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-800">
          <span
            className="inline-flex items-center justify-center w-8 h-8 bg-gold-500 text-white shrink-0"
            style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1 }}
          >
            RE
          </span>
          <span className="text-white font-700 text-sm leading-tight">
            Rebuttal Engine
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto">
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavLink href="/rca" label="RCA Manager" icon={FolderOpen} />
          <NavLink href="/evidence" label="Evidence" icon={FileStack} />
          <NavLink href="/reports" label="Reports" icon={BarChart3} />

          {isManagerPlus && (
            <NavLink href="/settings" label="Settings" icon={Settings} />
          )}

          {isAdmin && (
            <NavLink href="/admin" label="Admin Panel" icon={ShieldCheck} />
          )}
        </nav>

        {/* Bottom user section */}
        <div className="border-t border-navy-800 px-4 py-4">
          <p
            className="truncate mb-0.5"
            style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#7A95A5' }}
          >
            {user.orgName}
          </p>
          <p className="text-white text-xs font-500 truncate mb-3">{user.name}</p>

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="sidebar-link w-full text-left"
              style={{ paddingLeft: 0, paddingRight: 0 }}
            >
              <LogOut size={14} strokeWidth={1.75} />
              <span style={{ fontSize: 12 }}>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 bg-white border-b border-gray-100 shrink-0"
          style={{ height: 56 }}
        >
          {/* Page title placeholder — pages render their own h1 */}
          <div id="topbar-title" />

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="btn-ghost text-gray-400 hover:text-navy-900 p-1"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={1.75} />
            </button>
            <UserAvatar name={user.name} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
