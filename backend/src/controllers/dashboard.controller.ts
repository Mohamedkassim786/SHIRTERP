import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingOrders,
      totalCustomers,
      totalSuppliers,
      lowStockMaterials,
      recentOrders,
      todaySales,
      runningWorkOrders,
      finishedGoodsCount
    ] = await Promise.all([
      prisma.customerOrder.count({ where: { status: 'PENDING' } }),
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.rawMaterial.findMany({
        where: { currentStock: { lte: prisma.rawMaterial.fields.minStockLevel } },
        include: { unit: true },
        take: 10
      }),
      prisma.customerOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: true }
      }),
      prisma.salesInvoice.aggregate({
        where: { date: { gte: today } },
        _sum: { totalAmount: true }
      }),
      prisma.workOrder.count({ where: { status: 'RUNNING' } }),
      prisma.finishedGood.aggregate({ _sum: { quantity: true } })
    ]);

    // Manual low stock filter (Prisma can't compare two fields directly)
    const allMaterials = await prisma.rawMaterial.findMany({ include: { unit: true } });
    const lowStock = allMaterials.filter(m => m.currentStock <= m.minStockLevel);

    const recentActivities = recentOrders.map(o => ({
      id: o.id,
      action: `Order ${o.orderNumber} by ${o.customer?.name || 'Unknown'}`,
      time: o.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }));

    res.json({
      pendingOrders,
      todaySales: todaySales._sum.totalAmount || 0,
      runningWorkOrders,
      finishedGoodsStock: finishedGoodsCount._sum.quantity || 0,
      lowStockCount: lowStock.length,
      totalCustomers,
      totalSuppliers,
      lowStockMaterials: lowStock.slice(0, 5).map(m => ({
        id: m.id,
        name: m.name,
        current: m.currentStock,
        min: m.minStockLevel,
        unit: m.unit?.shortName || ''
      })),
      recentActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};
