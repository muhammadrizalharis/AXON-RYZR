import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@axon.unismuh.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin#12345';

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
  console.log('Default password (change immediately):', adminPassword);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
