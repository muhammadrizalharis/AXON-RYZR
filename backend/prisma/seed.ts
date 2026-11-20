import { randomBytes } from 'node:crypto';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@axon.local';
  const providedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (providedPassword !== undefined && providedPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters long');
  }
  // No hardcoded default: generate a one-time random password when unset.
  const adminPassword =
    providedPassword ?? randomBytes(18).toString('base64url');

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'AXON Super Admin',
      passwordHash,
      role: Role.SUPER_ADMIN,
      credits: 100000,
    },
  });

  console.log(`Seeded super-admin: ${admin.email}`);
  if (providedPassword === undefined) {
    console.log('Generated one-time password (shown once, change it):', adminPassword);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
