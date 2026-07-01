import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// CUSTOMERS
// -----------------------------------------------------------------------------

export const getCustomers = async (req: Request, res: Response) => {
  // Only return active customers (Soft Delete logic)
  const data = await prisma.customer.findMany({ 
    where: { isActive: true },
    orderBy: { createdAt: 'desc' } 
  });
  res.json(data);
};

export const createCustomer = async (req: Request, res: Response) => {
  const data = await prisma.customer.create({ data: req.body });
  res.status(201).json(data);
};

export const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await prisma.customer.update({ where: { id: Number(id) }, data: req.body });
  res.json(data);
};

export const deleteCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  // Soft Delete
  await prisma.customer.update({ where: { id: Number(id) }, data: { isActive: false } });
  res.json({ message: 'Customer deleted successfully' });
};

// -----------------------------------------------------------------------------
// CRM MODULE
// -----------------------------------------------------------------------------

export const getCrmDashboard = async (req: Request, res: Response) => {
  const totalCustomers = await prisma.customer.count({ where: { isActive: true } });
  const outstandingAggr = await prisma.customer.aggregate({
    where: { isActive: true },
    _sum: { outstandingBalance: true }
  });
  
  const pendingReminders = await prisma.customerReminder.findMany({
    where: { status: 'PENDING' },
    include: { customer: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
    take: 10
  });

  res.json({
    totalCustomers,
    totalOutstanding: outstandingAggr._sum.outstandingBalance || 0,
    pendingReminders
  });
};

export const getCustomerProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const customerId = Number(id);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  const invoices = await prisma.salesInvoice.findMany({
    where: { customerId },
    orderBy: { date: 'desc' }
  });

  const payments = await prisma.customerPayment.findMany({
    where: { customerId },
    orderBy: { date: 'desc' }
  });

  const reminders = await prisma.customerReminder.findMany({
    where: { customerId },
    orderBy: { dueDate: 'desc' }
  });

  const totalRevenue = invoices.reduce((acc: number, inv: any) => acc + inv.totalAmount, 0);

  res.json({
    ...customer,
    totalRevenue,
    invoices,
    payments,
    reminders
  });
};

export const createReminder = async (req: Request, res: Response) => {
  const { customerId, title, notes, dueDate } = req.body;
  const reminder = await prisma.customerReminder.create({
    data: {
      customerId: Number(customerId),
      title,
      notes,
      dueDate: new Date(dueDate)
    }
  });
  res.status(201).json(reminder);
};

export const updateReminderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const reminder = await prisma.customerReminder.update({
    where: { id: Number(id) },
    data: { status }
  });
  res.json(reminder);
};

// -----------------------------------------------------------------------------
// SUPPLIERS
// -----------------------------------------------------------------------------

export const getSuppliers = async (req: Request, res: Response) => {
  const data = await prisma.supplier.findMany({ 
    where: { isActive: true },
    orderBy: { createdAt: 'desc' } 
  });
  res.json(data);
};

export const createSupplier = async (req: Request, res: Response) => {
  const data = await prisma.supplier.create({ data: req.body });
  res.status(201).json(data);
};

export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await prisma.supplier.update({ where: { id: Number(id) }, data: req.body });
  res.json(data);
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.supplier.update({ where: { id: Number(id) }, data: { isActive: false } });
  res.json({ message: 'Supplier deleted successfully' });
};

export const getSupplierDashboard = async (req: Request, res: Response) => {
  const totalSuppliers = await prisma.supplier.count({ where: { isActive: true } });
  const outstandingAggr = await prisma.supplier.aggregate({
    where: { isActive: true },
    _sum: { outstandingBalance: true }
  });
  
  res.json({
    totalSuppliers,
    totalOutstanding: outstandingAggr._sum.outstandingBalance || 0
  });
};

export const getSupplierProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplierId = Number(id);

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId }
  });

  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { supplierId },
    orderBy: { createdAt: 'desc' }
  });

  const payments = await prisma.vendorPayment.findMany({
    where: { supplierId },
    orderBy: { date: 'desc' }
  });

  res.json({
    ...supplier,
    purchaseOrders,
    payments
  });
};

export const recordVendorPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplierId = Number(id);
    const { amount, method, reference } = req.body;

    const result = await prisma.$transaction(async (tx: any) => {
      // Create payment record
      const payment = await tx.vendorPayment.create({
        data: {
          supplierId,
          amount: Number(amount),
          method,
          reference,
          date: new Date()
        }
      });

      // Decrease supplier outstanding balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: { outstandingBalance: { decrement: Number(amount) } }
      });

      // ---- AUTO SYNC TO FINANCE ----
      // Find default accounts
      const cashAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Cash', isSystem: true } });
      const apAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Accounts Payable', isSystem: true } });
      
      if (cashAcc && apAcc) {
        // Vendor Payment: Debit Accounts Payable (decreasing liability), Credit Cash (decreasing asset)
        await tx.journalTransaction.create({
          data: {
            date: new Date(),
            amount: Number(amount),
            description: `Payment to Vendor ID: ${supplierId}`,
            reference: reference || 'Vendor Payment',
            debitAccountId: apAcc.id,
            creditAccountId: cashAcc.id
          }
        });
        
        // Decrement Cash (Credit Asset)
        await tx.ledgerAccount.update({
          where: { id: cashAcc.id },
          data: { balance: { decrement: Number(amount) } }
        });
        
        // Decrement Accounts Payable (Debit Liability)
        await tx.ledgerAccount.update({
          where: { id: apAcc.id },
          data: { balance: { decrement: Number(amount) } }
        });
      }

      return payment;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error recording vendor payment' });
  }
};
