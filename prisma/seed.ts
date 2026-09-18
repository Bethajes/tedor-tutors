import { PrismaClient, UserRoleName } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'auth.read.self', description: 'View own account' },
  { key: 'auth.manage.self', description: 'Change own password and sessions' },
  { key: 'admin.users.read', description: 'List and view user accounts' },
  { key: 'admin.users.write', description: 'Disable and manage user accounts' },
  { key: 'admin.roles.assign', description: 'Assign roles and manage RBAC' },
] as const;

const ROLE_PERMISSIONS: Record<UserRoleName, string[]> = {
  CLIENT: ['auth.read.self', 'auth.manage.self'],
  TUTOR: ['auth.read.self', 'auth.manage.self'],
  COORDINATOR: ['auth.read.self', 'auth.manage.self', 'admin.users.read'],
  ADMIN: ['auth.read.self', 'auth.manage.self', 'admin.users.read', 'admin.users.write'],
  SUPER_ADMIN: [
    'auth.read.self',
    'auth.manage.self',
    'admin.users.read',
    'admin.users.write',
    'admin.roles.assign',
  ],
};

async function seedPermissions() {
  const created: Record<string, { id: string }> = {};
  for (const permission of PERMISSIONS) {
    created[permission.key] = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
  return created;
}

async function seedRoles(permissions: Record<string, { id: string }>) {
  const roles: Record<UserRoleName, { id: string }> = {} as never;
  for (const name of Object.keys(ROLE_PERMISSIONS) as UserRoleName[]) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: `${name} role` },
      create: { name, description: `${name} role` },
    });
    roles[name] = role;

    const keys = ROLE_PERMISSIONS[name];
    await prisma.$transaction(
      keys.map((key) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permissions[key].id } },
          update: {},
          create: { roleId: role.id, permissionId: permissions[key].id },
        }),
      ),
    );
  }
  return roles;
}

async function upsertUser(
  email: string,
  password: string,
  name: string,
  role: UserRoleName,
  options: { phone?: string; emailVerified?: boolean } = {},
) {
  const passwordHash = await argon2.hash(password);
  const roleId = (await prisma.role.findUniqueOrThrow({ where: { name: role } })).id;
  const status = options.emailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION';
  const user = await prisma.user.upsert({
    where: { email },
    // Refresh on re-run so the credentials below always work in dev.
    update: { name, passwordHash, roleId, status },
    create: {
      name,
      email,
      phone: options.phone ?? null,
      passwordHash,
      emailVerifiedAt: options.emailVerified ? new Date() : null,
      status,
      roleId,
    },
  });
  return { email: user.email, role, status: user.status };
}

async function main() {
  const permissions = await seedPermissions();
  await seedRoles(permissions);

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@tedor.local';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'AdminDev123!';
  const demoAdminEmail = process.env.SEED_DEMO_ADMIN_EMAIL ?? 'staff-admin@tedor.local';
  const demoCoordinatorEmail =
    process.env.SEED_DEMO_COORDINATOR_EMAIL ?? 'coordinator@tedor.local';
  const demoClientEmail = process.env.SEED_DEMO_CLIENT_EMAIL ?? 'client@tedor.local';
  const demoTutorEmail = process.env.SEED_DEMO_TUTOR_EMAIL ?? 'tutor@tedor.local';
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'DemoPass123!';

  const accounts = await Promise.all([
    upsertUser(superAdminEmail, superAdminPassword, 'Tedor Super Admin', UserRoleName.SUPER_ADMIN, {
      emailVerified: true,
    }),
    upsertUser(demoAdminEmail, demoPassword, 'Demo Admin', UserRoleName.ADMIN, {
      phone: '+12025550103',
      emailVerified: true,
    }),
    upsertUser(
      demoCoordinatorEmail,
      demoPassword,
      'Demo Coordinator',
      UserRoleName.COORDINATOR,
      { phone: '+12025550104', emailVerified: true },
    ),
    upsertUser(demoClientEmail, demoPassword, 'Demo Client', UserRoleName.CLIENT, {
      phone: '+12025550101',
      emailVerified: true,
    }),
    upsertUser(demoTutorEmail, demoPassword, 'Demo Tutor', UserRoleName.TUTOR, {
      phone: '+12025550102',
      emailVerified: true,
    }),
  ]);

  console.log('Seed complete. Accounts (passwords from SEED_* env in apps/api/.env):');
  accounts.forEach((account) =>
    console.log(`  ${account.email} · role=${account.role} · status=${account.status}`),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });