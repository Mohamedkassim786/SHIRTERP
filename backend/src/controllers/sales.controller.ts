import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSalesInvoices = async (req: Request, res: Response) => {
  try {
    const data = await prisma.salesInvoice.findMany({
      include: { customer: true, items: { include: { model: true, color: true, size: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoices' });
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { model: true, color: true, size: true } },
      },
    });

    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching invoice' });
  }
};


export const createSalesInvoice = async (req: Request, res: Response) => {
  try {
    const { customerId, orderId, items } = req.body;
    
    const count = await prisma.salesInvoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subTotal = 0;
    let gstAmount = 0;

    const invoiceItemsData = items.map((item: any) => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineGst = lineTotal * (item.gstPercent / 100);
      subTotal += lineTotal;
      gstAmount += lineGst;

      return {
        modelId: Number(item.modelId),
        colorId: Number(item.colorId),
        sizeId: Number(item.sizeId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        gstPercent: Number(item.gstPercent),
        totalPrice: lineTotal + lineGst
      };
    });

    const totalAmount = subTotal + gstAmount;

    const result = await prisma.$transaction(async (tx: any) => {
      // Create Invoice
      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNumber,
          customerId: Number(customerId),
          orderId: orderId ? Number(orderId) : null,
          subTotal,
          gstAmount,
          totalAmount,
          items: { create: invoiceItemsData }
        },
        include: { items: true, customer: true }
      });

      // Deduct from Finished Goods Inventory
      for (const item of invoiceItemsData) {
        await tx.finishedGood.upsert({
          where: {
            modelId_colorId_sizeId: {
              modelId: item.modelId,
              colorId: item.colorId,
              sizeId: item.sizeId
            }
          },
          update: {
            quantity: { decrement: item.quantity }
          },
          create: {
            modelId: item.modelId,
            colorId: item.colorId,
            sizeId: item.sizeId,
            quantity: -item.quantity
          }
        });

        await tx.finishedGoodStockTxn.create({
          data: {
            modelId: item.modelId,
            colorId: item.colorId,
            sizeId: item.sizeId,
            type: 'OUT',
            quantity: item.quantity,
            reference: invoiceNumber
          }
        });
      }

      // If tied to an order, update order status to DELIVERED
      if (orderId) {
        await tx.customerOrder.update({
          where: { id: Number(orderId) },
          data: { status: 'DELIVERED' }
        });
      }

      // Update customer outstanding balance
      await tx.customer.update({
        where: { id: Number(customerId) },
        data: { outstandingBalance: { increment: totalAmount } }
      });

      return invoice;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error creating sales invoice' });
  }
};

export const receivePayment = async (req: Request, res: Response) => {
  try {
    const { customerId, amount, method, reference } = req.body;
    
    const result = await prisma.$transaction(async (tx: any) => {
      const payment = await tx.customerPayment.create({
        data: {
          customerId: Number(customerId),
          amount: Number(amount),
          method,
          reference
        }
      });

      await tx.customer.update({
        where: { id: Number(customerId) },
        data: { outstandingBalance: { decrement: Number(amount) } }
      });

      // ---- AUTO SYNC TO FINANCE ----
      const cashAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Cash', isSystem: true } });
      const arAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Accounts Receivable', isSystem: true } });
      
      if (cashAcc && arAcc) {
        // Customer Payment: Debit Cash (increase asset), Credit Accounts Receivable (decrease asset)
        await tx.journalTransaction.create({
          data: {
            date: new Date(),
            amount: Number(amount),
            description: `Payment from Customer ID: ${customerId}`,
            reference: reference || 'Customer Payment',
            debitAccountId: cashAcc.id,
            creditAccountId: arAcc.id
          }
        });
        
        await tx.ledgerAccount.update({
          where: { id: cashAcc.id },
          data: { balance: { increment: Number(amount) } }
        });
        
        await tx.ledgerAccount.update({
          where: { id: arAcc.id },
          data: { balance: { decrement: Number(amount) } }
        });
      }

      return payment;
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: 'Error processing payment' });
  }
};
