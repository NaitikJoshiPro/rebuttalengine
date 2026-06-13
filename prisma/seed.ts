import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.org.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo',
      merchantName: 'Demo Merchant Co.',
      merchantMcc: '4722',
      plan: 'STARTER',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      passwordHash: await hash('changeme123', 12),
    },
  });

  await prisma.orgUser.upsert({
    where: { orgId_userId: { orgId: org.id, userId: adminUser.id } },
    update: {},
    create: { orgId: org.id, userId: adminUser.id, role: 'ADMIN' },
  });

  const analystUser = await prisma.user.upsert({
    where: { email: 'analyst@demo.com' },
    update: {},
    create: {
      email: 'analyst@demo.com',
      name: 'Demo Analyst',
      passwordHash: await hash('changeme123', 12),
    },
  });

  await prisma.orgUser.upsert({
    where: { orgId_userId: { orgId: org.id, userId: analystUser.id } },
    update: {},
    create: { orgId: org.id, userId: analystUser.id, role: 'ANALYST' },
  });

  console.error(`Seeded org: ${org.slug}`);
  console.error(`Admin:   admin@demo.com / changeme123 (org slug: demo)`);
  console.error(`Analyst: analyst@demo.com / changeme123 (org slug: demo)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
