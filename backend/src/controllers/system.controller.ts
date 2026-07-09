import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 200 // Limit to recent 200 logs for performance
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
};

export const exportDatabase = async (req: Request, res: Response) => {
  try {
    // Check if user is admin (optional safety measure, though auth middleware already guards routes)
    const user = (req as any).user;
    if (user && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only administrators can export the database' });
    }

    // Dump all critical tables
    const [
      users,
      roles,
      customers,
      suppliers,
      rawMaterials,
      products,
      customerOrders,
      workOrders,
      salesInvoices,
      finishedGoods
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, roleId: true } }), // Exclude passwords
      prisma.role.findMany(),
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.rawMaterial.findMany(),
      prisma.product.findMany(),
      prisma.customerOrder.findMany({ include: { items: true } }),
      prisma.workOrder.findMany({ include: { stages: true } }),
      prisma.salesInvoice.findMany({ include: { items: true } }),
      prisma.finishedGood.findMany()
    ]);

    const dump = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        version: '1.0'
      },
      data: {
        users,
        roles,
        customers,
        suppliers,
        rawMaterials,
        products,
        customerOrders,
        workOrders,
        salesInvoices,
        finishedGoods
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=shirterp_backup_${new Date().getTime()}.json`);
    res.send(JSON.stringify(dump, null, 2));

  } catch (error) {
    console.error('Error exporting database:', error);
    res.status(500).json({ message: 'Error generating backup' });
  }
};
