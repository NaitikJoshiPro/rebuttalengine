'use client';

import { useEffect, useState, useCallback } from 'react';
import type { UserRole } from '@/types';
import { hasPermission } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  merchantName: string | null;
  plan: string;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  orgId: string;
  orgName: string;
  role: UserRole;
}

const ROLES: UserRole[] = ['VIEWER', 'ANALYST', 'MANAGER', 'LEADER', 'ADMIN'];

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const cls =
    role === 'ADMIN'
      ? 'badge badge-red'
      : role === 'LEADER'
        ? 'badge badge-gold'
        : role === 'MANAGER'
          ? 'badge badge-navy'
          : role === 'ANALYST'
            ? 'badge badge-green'
            : 'badge badge-gray';
  return <span className={cls}>{role}</span>;
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 20px',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '1.5px',
        borderBottom: active ? '2px solid #B8953A' : '2px solid transparent',
        color: active ? '#B8953A' : '#9ca3af',
        background: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: '#B8953A',
        marginBottom: 16,
        marginTop: 24,
      }}
    >
      {children}
    </h3>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<'profile' | 'org' | 'users' | 'patterns'>('profile');
  const [session, setSession] = useState<SessionUser | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Org form
  const [orgName, setOrgName] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMsg, setOrgMsg] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('ANALYST');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionRes, orgRes, membersRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/org'),
        fetch('/api/org/members'),
      ]);
      const sessionJson = await sessionRes.json() as { user?: SessionUser };
      const orgJson = await orgRes.json() as { data?: OrgInfo };
      const membersJson = await membersRes.json() as { data?: OrgMember[] };

      const u = sessionJson.user ?? null;
      setSession(u);
      if (u) setProfileName(u.name);

      const o = orgJson.data ?? null;
      setOrg(o);
      if (o) {
        setOrgName(o.name);
        setMerchantName(o.merchantName ?? '');
      }

      setMembers(membersJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Save profile
  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      });
      setProfileMsg(res.ok ? 'Profile updated.' : 'Failed to update.');
    } finally {
      setProfileSaving(false);
    }
  }

  // Save org
  async function saveOrg() {
    setOrgSaving(true);
    setOrgMsg(null);
    try {
      const res = await fetch('/api/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, merchantName }),
      });
      setOrgMsg(res.ok ? 'Organization updated.' : 'Failed to update.');
    } finally {
      setOrgSaving(false);
    }
  }

  // Invite user
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteMsg('Invitation sent.');
        setInviteEmail('');
      } else {
        const body = await res.json() as { error?: string };
        setInviteMsg(body.error ?? 'Failed to invite.');
      }
    } finally {
      setInviting(false);
    }
  }

  // Change role
  async function changeRole(memberId: string, role: UserRole) {
    await fetch(`/api/org/members/${memberId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    await fetchData();
  }

  // Remove member
  async function removeMember(memberId: string) {
    if (!confirm('Remove this member?')) return;
    await fetch(`/api/org/members/${memberId}`, { method: 'DELETE' });
    await fetchData();
  }

  const isAdmin = session?.role === 'ADMIN';
  const isLeaderPlus = session ? hasPermission(session.role, 'LEADER') : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <h1 className="text-navy-900 font-900 text-2xl mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 mb-8 gap-0">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>Profile</TabButton>
        <TabButton active={tab === 'org'} onClick={() => setTab('org')}>Organization</TabButton>
        {isAdmin && (
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
        )}
        {isLeaderPlus && (
          <TabButton active={tab === 'patterns'} onClick={() => setTab('patterns')}>Patterns</TabButton>
        )}
      </div>

      {/* ── Profile tab ─────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="bg-white border border-gray-100 p-6 max-w-lg">
          <SectionHeading>Profile</SectionHeading>
          <div className="space-y-4">
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={session?.email ?? ''}
                disabled
                className="form-input"
                style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}
              />
            </div>
            <div>
              <label className="form-label">Role</label>
              <div className="mt-1">
                <RoleBadge role={session?.role ?? 'VIEWER'} />
              </div>
            </div>
            {profileMsg && (
              <p className="text-xs font-600" style={{ color: profileMsg.includes('updated') ? '#059669' : '#dc2626' }}>
                {profileMsg}
              </p>
            )}
            <button
              type="button"
              onClick={saveProfile}
              disabled={profileSaving}
              className="btn-primary"
            >
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* ── Organization tab ─────────────────────────────────────────────── */}
      {tab === 'org' && (
        <div className="bg-white border border-gray-100 p-6 max-w-lg">
          <SectionHeading>Organization</SectionHeading>
          <div className="space-y-4">
            <div>
              <label className="form-label">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="form-input"
                disabled={!isAdmin}
              />
            </div>
            <div>
              <label className="form-label">Merchant Name</label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="form-input"
                disabled={!isAdmin}
              />
            </div>
            <div>
              <label className="form-label">Slug</label>
              <input
                type="text"
                value={org?.slug ?? ''}
                disabled
                className="form-input"
                style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}
              />
            </div>
            <div>
              <label className="form-label">Plan</label>
              <input
                type="text"
                value={org?.plan ?? ''}
                disabled
                className="form-input"
                style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}
              />
            </div>
            {orgMsg && (
              <p className="text-xs font-600" style={{ color: orgMsg.includes('updated') ? '#059669' : '#dc2626' }}>
                {orgMsg}
              </p>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={saveOrg}
                disabled={orgSaving}
                className="btn-primary"
              >
                {orgSaving ? 'Saving…' : 'Save Organization'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Users tab (ADMIN only) ───────────────────────────────────────── */}
      {tab === 'users' && isAdmin && (
        <div>
          {/* Invite form */}
          <div className="bg-white border border-gray-100 p-6 mb-6">
            <SectionHeading>Invite User</SectionHeading>
            <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label">Email Address<span className="form-required">*</span></label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="form-input"
                  placeholder="analyst@company.com"
                  required
                />
              </div>
              <div style={{ width: 160 }}>
                <label className="form-label">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="form-input"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="btn-primary"
                style={{ padding: '12px 20px' }}
              >
                {inviting ? 'Inviting…' : 'Send Invite'}
              </button>
            </form>
            {inviteMsg && (
              <p className="text-xs font-600 mt-3" style={{ color: inviteMsg.includes('sent') ? '#059669' : '#dc2626' }}>
                {inviteMsg}
              </p>
            )}
          </div>

          {/* Members table */}
          <div className="bg-white border border-gray-100 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="font-600 text-navy-900">{m.name}</td>
                    <td className="text-gray-500">{m.email}</td>
                    <td>
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value as UserRole)}
                        disabled={m.userId === session?.id}
                        className="form-input"
                        style={{ width: 120, padding: '4px 8px', fontSize: 11 }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-gray-400">
                      {new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      {m.userId !== session?.id && (
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          className="text-red-400 text-xs font-700 uppercase"
                          style={{ letterSpacing: '1px' }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">No members</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Patterns tab (LEADER+) ───────────────────────────────────────── */}
      {tab === 'patterns' && isLeaderPlus && (
        <div className="bg-white border border-gray-100 p-6">
          <SectionHeading>Rebuttal Patterns</SectionHeading>
          <p className="text-gray-400 text-sm mb-4">
            Configure AI generation strategies and evidence checklists per reason code.
          </p>
          <p className="text-gray-300 text-xs italic">
            Pattern editor coming soon — contact support to update patterns.
          </p>
        </div>
      )}
    </div>
  );
}
