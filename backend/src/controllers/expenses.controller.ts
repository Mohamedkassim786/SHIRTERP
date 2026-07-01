import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Expense Categories ────────────────────────────────────────────────────────
export const getCategories = async (_req: Request, res: Response) => {
  const data = await prisma.expenseCategory.findMany({ include: { _count: { select: { expenses: true } } } });
  res.json(data);
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const data = await prisma.expenseCategory.create({ data: { name: req.body.name } });
    res.status(201).json(data);
  } catch { res.status(400).json({ message: 'Category already exists' }); }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    await prisma.expenseCategory.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch { res.status(400).json({ message: 'Cannot delete — expenses exist in this category' }); }
};

// ── Expenses ──────────────────────────────────────────────────────────────────
export const getExpenses = async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const where: any = {};
  if (from) where.date = { gte: new Date(from as string) };
  if (to) where.date = { ...where.date, lte: new Date(to as string) };

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' }
  });
  res.json(expenses);
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { categoryId, amount, description, paidBy, reference, date } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      const data = await tx.expense.create({
        data: {
          categoryId: Number(categoryId),
          amount: Number(amount),
          description,
          paidBy: paidBy || 'CASH',
          reference,
          date: date ? new Date(date) : new Date()
        },
        include: { category: true }
      });

      // ---- AUTO SYNC TO FINANCE ----
      const cashAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Cash', isSystem: true } });
      const expAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Operating Expenses', isSystem: true } });
      
      if (cashAcc && expAcc) {
        // Expense: Debit Expense (increase expense), Credit Cash (decrease asset)
        await tx.journalTransaction.create({
          data: {
            date: date ? new Date(date) : new Date(),
            amount: Number(amount),
            description: `Expense: ${description}`,
            reference: reference || 'Expense',
            debitAccountId: expAcc.id,
            creditAccountId: cashAcc.id
          }
        });
        
        await tx.ledgerAccount.update({
          where: { id: expAcc.id },
          data: { balance: { increment: Number(amount) } }
        });
        
        await tx.ledgerAccount.update({
          where: { id: cashAcc.id },
          data: { balance: { decrement: Number(amount) } }
        });
      }

      return data;
    });

    res.status(201).json(result);
  } catch (e) { console.error(e); res.status(400).json({ message: 'Error creating expense' }); }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { categoryId, amount, description, paidBy, reference, date } = req.body;
    const data = await prisma.expense.update({
      where: { id: Number(req.params.id) },
      data: { categoryId: Number(categoryId), amount: Number(amount), description, paidBy, reference, date: date ? new Date(date) : undefined },
      include: { category: true }
    });
    res.json(data);
  } catch { res.status(400).json({ message: 'Error updating expense' }); }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    await prisma.expense.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch { res.status(400).json({ message: 'Error deleting expense' }); }
};

export const getExpenseSummary = async (_req: Request, res: Response) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalThisMonth, byCategory] = await Promise.all([
    prisma.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: { date: { gte: monthStart } }
    })
  ]);

  const cats = await prisma.expenseCategory.findMany();
  const catMap: Record<number, string> = {};
  cats.forEach(c => { catMap[c.id] = c.name; });

  res.json({
    totalThisMonth: totalThisMonth._sum.amount || 0,
    byCategory: byCategory.map(b => ({
      categoryName: catMap[b.categoryId] || 'Unknown',
      total: b._sum.amount || 0
    }))
  });
};
