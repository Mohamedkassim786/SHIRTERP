import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getFullReports = async (req: Request, res: Response) => {
  const { type, from, to, year, month } = req.query;
  const fromDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), 0, 1);
  const toDate = to ? new Date(to as string) : new Date();

  try {
    switch (type) {
      case 'sales': {
        const invoices = await prisma.salesInvoice.findMany({
          where: { date: { gte: fromDate, lte: toDate } },
          include: { customer: true, items: { include: { model: true, color: true, size: true } } },
          orderBy: { date: 'desc' }
        });
        const total = invoices.reduce((s, i) => s + i.totalAmount, 0);
        res.json({ invoices, total });
        break;
      }
      case 'purchase': {
        const orders = await prisma.purchaseOrder.findMany({
          where: { createdAt: { gte: fromDate, lte: toDate } },
          include: { supplier: true, items: { include: { material: true } } },
          orderBy: { createdAt: 'desc' }
        });
        const total = orders.reduce((s, o) => s + o.totalAmount, 0);
        res.json({ orders, total });
        break;
      }
      case 'stock': {
        const materials = await prisma.rawMaterial.findMany({ include: { unit: true } });
        const finished = await prisma.finishedGood.findMany({ include: { model: true, color: true, size: true } });
        const lowStock = materials.filter(m => m.currentStock <= m.minStockLevel);
        res.json({ materials, finished, lowStockCount: lowStock.length, lowStock });
        break;
      }
      case 'gst': {
        const invoices = await prisma.salesInvoice.findMany({
          where: { date: { gte: fromDate, lte: toDate } },
          include: { customer: true, items: true }
        });
        const purchases = await prisma.purchaseOrder.findMany({
          where: { status: 'COMPLETED', createdAt: { gte: fromDate, lte: toDate } }
        });
        const outputGst = invoices.reduce((s, i) => s + i.gstAmount, 0);
        const inputGst = purchases.reduce((s, p) => s + (p.totalAmount * 0.05), 0); // estimate
        res.json({ outputGst, inputGst, netGst: outputGst - inputGst, invoices, totalSales: invoices.reduce((s, i) => s + i.subTotal, 0) });
        break;
      }
      case 'outstanding': {
        const customers = await prisma.customer.findMany({ where: { outstandingBalance: { gt: 0 } }, orderBy: { outstandingBalance: 'desc' } });
        const suppliers = await prisma.supplier.findMany({ where: { outstandingBalance: { gt: 0 } }, orderBy: { outstandingBalance: 'desc' } });
        const totalCustomerOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);
        const totalSupplierOutstanding = suppliers.reduce((s, s2) => s + s2.outstandingBalance, 0);
        res.json({ customers, suppliers, totalCustomerOutstanding, totalSupplierOutstanding });
        break;
      }
      case 'pl': {
        const [salesData, expenseData, purchaseData] = await Promise.all([
          prisma.salesInvoice.aggregate({ where: { date: { gte: fromDate, lte: toDate } }, _sum: { totalAmount: true } }),
          prisma.expense.aggregate({ where: { date: { gte: fromDate, lte: toDate } }, _sum: { amount: true } }),
          prisma.purchaseOrder.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: fromDate, lte: toDate } }, _sum: { totalAmount: true } })
        ]);
        const revenue = salesData._sum.totalAmount || 0;
        const expenses = expenseData._sum.amount || 0;
        const purchases = purchaseData._sum.totalAmount || 0;
        const grossProfit = revenue - purchases;
        const netProfit = grossProfit - expenses;
        res.json({ revenue, purchases, grossProfit, expenses, netProfit, fromDate, toDate });
        break;
      }
      case 'customer': {
        const customers = await prisma.customer.findMany({
          include: {
            _count: { select: { orders: true, invoices: true } },
            invoices: { select: { totalAmount: true } }
          }
        });
        const withTotal = customers.map(c => ({
          ...c, totalRevenue: c.invoices.reduce((s, i) => s + i.totalAmount, 0)
        })).sort((a, b) => b.totalRevenue - a.totalRevenue);
        res.json(withTotal);
        break;
      }
      case 'employees': {
        const m = Number(month) || new Date().getMonth() + 1;
        const y = Number(year) || new Date().getFullYear();
        const from2 = new Date(y, m - 1, 1);
        const to2 = new Date(y, m, 0, 23, 59, 59);
        const employees = await prisma.employee.findMany({ include: { department: true } });
        const attendance = await prisma.attendance.findMany({ where: { date: { gte: from2, lte: to2 } } });
        const salaries = await prisma.salaryPayment.findMany({ where: { month: m, year: y } });

        const attMap: Record<number, { present: number, absent: number, halfDay: number }> = {};
        attendance.forEach(a => {
          if (!attMap[a.employeeId]) attMap[a.employeeId] = { present: 0, absent: 0, halfDay: 0 };
          if (a.status === 'PRESENT') attMap[a.employeeId].present++;
          else if (a.status === 'ABSENT') attMap[a.employeeId].absent++;
          else if (a.status === 'HALF_DAY') attMap[a.employeeId].halfDay++;
        });
        const salMap: Record<number, any> = {};
        salaries.forEach(s => { salMap[s.employeeId] = s; });

        res.json(employees.map(e => ({ ...e, attendanceSummary: attMap[e.id] || { present: 0, absent: 0, halfDay: 0 }, salaryPayment: salMap[e.id] || null })));
        break;
      }
      default:
        res.status(400).json({ message: 'Invalid report type' });
    }
  } catch (e) { console.error(e); res.status(500).json({ message: 'Error generating report' }); }
};
