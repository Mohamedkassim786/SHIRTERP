import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    console.log(`[AUTH ATTEMPT] email: "${email}", password: "${password}"`);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      console.log(`[AUTH FAILED] User not found or inactive for email: "${email}"`);
      res.status(401).json({ message: 'Invalid credentials or inactive account' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      console.log(`[AUTH FAILED] Invalid password for email: "${email}"`);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    
    console.log(`[AUTH SUCCESS] User logged in: ${email}`);

    const token = generateToken(user.id, user.role.name);

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: { ip: req.ip },
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
