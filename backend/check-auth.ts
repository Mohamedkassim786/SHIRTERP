import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const p = new PrismaClient();

async function main() {
  const user = await p.user.findFirst({ where: { email: 'admin@erp.com' } });
  if (!user) {
    console.log('USER NOT FOUND - need to re-seed');
    return;
  }
  console.log('User found: id=' + user.id + ' email=' + user.email + ' isActive=' + user.isActive);
  const valid = await bcrypt.compare('admin', user.passwordHash);
  console.log('Password "admin" valid:', valid);
  const validManager = await bcrypt.compare('manager123', user.passwordHash);
  console.log('Password "manager123" valid:', validManager);
}

main().finally(() => p.$disconnect());
