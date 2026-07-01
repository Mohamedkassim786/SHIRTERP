import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

export const generateToken = (userId: number, roleName: string) => {
  return jwt.sign({ id: userId, role: roleName }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
