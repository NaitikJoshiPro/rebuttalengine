import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { UserRole } from '@/types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgSlug: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, orgSlug } = parsed.data;

        const orgUser = await prisma.orgUser.findFirst({
          where: {
            org: { slug: orgSlug },
            user: { email },
          },
          include: {
            user: true,
            org: true,
          },
        });

        if (!orgUser) return null;

        const valid = await compare(password, orgUser.user.passwordHash);
        if (!valid) return null;

        return {
          id: orgUser.user.id,
          name: orgUser.user.name,
          email: orgUser.user.email,
          orgId: orgUser.org.id,
          orgName: orgUser.org.name,
          orgSlug: orgUser.org.slug,
          role: orgUser.role as UserRole,
          merchantName: orgUser.org.merchantName ?? orgUser.org.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.orgId = (user as { orgId: string }).orgId;
        token.orgName = (user as { orgName: string }).orgName;
        token.orgSlug = (user as { orgSlug: string }).orgSlug;
        token.role = (user as { role: UserRole }).role;
        token.merchantName = (user as { merchantName: string }).merchantName;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as Record<string, unknown>).orgId = token.orgId;
      (session.user as Record<string, unknown>).orgName = token.orgName;
      (session.user as Record<string, unknown>).orgSlug = token.orgSlug;
      (session.user as Record<string, unknown>).role = token.role;
      (session.user as Record<string, unknown>).merchantName = token.merchantName;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
});

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error('UNAUTHENTICATED');
  return session.user as {
    id: string;
    name: string;
    email: string;
    orgId: string;
    orgName: string;
    orgSlug: string;
    role: UserRole;
    merchantName: string;
  };
}

export async function requireRole(minimumRole: UserRole) {
  const user = await requireAuth();
  const levels: Record<UserRole, number> = {
    VIEWER: 1, ANALYST: 2, MANAGER: 3, LEADER: 4, ADMIN: 5,
  };
  if (levels[user.role] < levels[minimumRole]) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
