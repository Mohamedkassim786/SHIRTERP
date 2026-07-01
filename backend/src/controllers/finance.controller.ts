import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed initial default accounts if they don't exist
const ensureDefaultAccounts = async () => {
  const defaults = [
    { name: 'Cash', type: 'ASSET', isSystem: true },
    { name: 'Bank Account', type: 'ASSET', isSystem: true },
    { name: 'Sales Revenue', type: 'REVENUE', isSystem: true },
    { name: 'Cost of Goods Sold', type: 'EXPENSE', isSystem: true },
    { name: 'Operating Expenses', type: 'EXPENSE', isSystem: true },
    { name: 'Accounts Receivable', type: 'ASSET', isSystem: true },
    { name: 'Accounts Payable', type: 'LIABILITY', isSystem: true },
  ];

  for (const acc of defaults) {
    await prisma.ledgerAccount.upsert({
      where: { name: acc.name },
      update: {},
      create: acc
    });
  }
};

// GET /api/finance/accounts
export const getAccounts = async (req: Request, res: Response) => {
  try {
    await ensureDefaultAccounts();
    const accounts = await prisma.ledgerAccount.findMany({
      orderBy: { type: 'asc' }
    });
    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching accounts' });
  }
};

// POST /api/finance/accounts
export const createAccount = async (req: Request, res: Response) => {
  try {
    const { name, type } = req.body;
    const account = await prisma.ledgerAccount.create({
      data: { name, type, isSystem: false }
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ message: 'Account creation failed. Name must be unique.' });
  }
};

// GET /api/finance/transactions
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const txns = await prisma.journalTransaction.findMany({
      include: {
        debitAccount: true,
        creditAccount: true
      },
      orderBy: { date: 'desc' },
      take: 200 // limit to recent 200 for Daybook
    });
    res.json(txns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

// POST /api/finance/transactions
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { date, amount, description, reference, debitAccountId, creditAccountId } = req.body;
    
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be > 0' });
    if (debitAccountId === creditAccountId) return res.status(400).json({ message: 'Debit and Credit accounts must be different' });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const txn = await tx.journalTransaction.create({
        data: {
          date: date ? new Date(date) : new Date(),
          amount: Number(amount),
          description,
          reference,
          debitAccountId: Number(debitAccountId),
          creditAccountId: Number(creditAccountId)
        }
      });

      // 2. Update Account Balances
      // Normal balances: Assets & Expenses increase with Debit
      // Liabilities, Equity & Revenue increase with Credit
      
      const debitAcc = await tx.ledgerAccount.findUnique({ where: { id: Number(debitAccountId) } });
      const creditAcc = await tx.ledgerAccount.findUnique({ where: { id: Number(creditAccountId) } });

      if (!debitAcc || !creditAcc) throw new Error("Account not found");

      // Update Debit Account
      const debitMultiplier = (debitAcc.type === 'ASSET' || debitAcc.type === 'EXPENSE') ? 1 : -1;
      await tx.ledgerAccount.update({
        where: { id: debitAcc.id },
        data: { balance: { increment: amount * debitMultiplier } }
      });

      // Update Credit Account
      const creditMultiplier = (creditAcc.type === 'LIABILITY' || creditAcc.type === 'EQUITY' || creditAcc.type === 'REVENUE') ? 1 : -1;
      await tx.ledgerAccount.update({
        where: { id: creditAcc.id },
        data: { balance: { increment: amount * creditMultiplier } }
      });

      return txn;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Transaction failed' });
  }
};

// GET /api/finance/dashboard
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.ledgerAccount.findMany();
    
    let totalRevenue = 0;
    let totalExpense = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach(acc => {
      if (acc.type === 'REVENUE') totalRevenue += acc.balance;
      if (acc.type === 'EXPENSE') totalExpense += acc.balance;
      if (acc.type === 'ASSET') totalAssets += acc.balance;
      if (acc.type === 'LIABILITY') totalLiabilities += acc.balance;
    });

    res.json({
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      totalAssets,
      totalLiabilities
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching finance dashboard' });
  }
};
