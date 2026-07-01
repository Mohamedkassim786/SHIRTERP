import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const activityLogger = (req: Request, res: Response, next: NextFunction) => {
  // We only want to log mutations, not reads (GET) or preflight (OPTIONS)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Wait for the response to finish to ensure the action succeeded
    res.on('finish', async () => {
      // Only log successful actions (status 2xx or 3xx)
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const user = (req as any).user;
          if (user && user.id) {
            let action = 'UPDATED';
            if (req.method === 'POST') action = 'CREATED';
            if (req.method === 'DELETE') action = 'DELETED';

            // Clean up URL to use as entity (e.g. /api/sales/invoices -> sales/invoices)
            const entity = req.originalUrl.replace('/api/', '').split('?')[0];

            await prisma.activityLog.create({
              data: {
                userId: user.id,
                action,
                entity,
                details: {
                  method: req.method,
                  status: res.statusCode,
                  ip: req.ip
                }
              }
            });
          }
        } catch (error) {
          console.error('Error logging activity:', error);
        }
      }
    });
  }
  next();
};
