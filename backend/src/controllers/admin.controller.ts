import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Company Settings ──────────────────────────────────────────────────────────
export const getSettings = async (_req: Request, res: Response) => {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({ data: { companyName: 'ShirtERP' } });
  }
  res.json(settings);
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({ data: req.body });
    } else {
      settings = await prisma.companySettings.update({ where: { id: settings.id }, data: req.body });
    }
    res.json(settings);
  } catch (e) { console.error(e); res.status(400).json({ message: 'Error saving settings' }); }
};

// ── User Management ───────────────────────────────────────────────────────────
export const getUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { name: 'asc' } });
  res.json(users.map(u => ({ ...u, passwordHash: undefined }))); // strip hash
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const data = await prisma.user.create({
      data: { name: req.body.name, email: req.body.email, passwordHash, roleId: Number(req.body.roleId) },
      include: { role: true }
    });
    res.status(201).json({ ...data, passwordHash: undefined });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ message: 'Email already exists' });
    res.status(400).json({ message: 'Error creating user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const updateData: any = { name: req.body.name, roleId: Number(req.body.roleId), isActive: req.body.isActive };
    if (req.body.password) {
      const bcrypt = await import('bcrypt');
      updateData.passwordHash = await bcrypt.hash(req.body.password, 10);
    }
    const data = await prisma.user.update({ where: { id: Number(req.params.id) }, data: updateData, include: { role: true } });
    res.json({ ...data, passwordHash: undefined });
  } catch { res.status(400).json({ message: 'Error updating user' }); }
};

export const getRoles = async (_req: Request, res: Response) => {
  const roles = await prisma.role.findMany({ include: { _count: { select: { users: true } } } });
  res.json(roles);
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const data = await prisma.role.create({ data: { name: req.body.name, permissions: req.body.permissions || {} } });
    res.status(201).json(data);
  } catch { res.status(400).json({ message: 'Role name already exists' }); }
};
