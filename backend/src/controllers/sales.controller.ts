import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSalesInvoices = async (req: Request, res: Response) => {
  try {
    const data = await prisma.salesInvoice.findMany({
      include: { 
        customer: true, 
        items: { include: { product: true, color: true, size: true } },
        payments: { orderBy: { date: 'asc' } }
      },
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
        items: { include: { product: true, color: true, size: true } },
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
          netPayable: totalAmount,
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
    const { customerId, invoiceId, amount, method, reference, notes } = req.body;

    if (!customerId || !amount || !method) {
      return res.status(400).json({ message: 'customerId, amount and method are required.' });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Generate receipt number: RCP-YYYY-NNNN
      const count = await tx.customerPayment.count();
      const year = new Date().getFullYear();
      const receiptNumber = `RCP-${year}-${String(count + 1).padStart(4, '0')}`;

      // 2. Create payment record
      const payment = await tx.customerPayment.create({
        data: {
          receiptNumber,
          customerId: Number(customerId),
          invoiceId: invoiceId ? Number(invoiceId) : null,
          amount: Number(amount),
          method,
          reference: reference || null,
          notes: notes || null,
        },
        include: {
          customer: true,
          invoice: {
            include: { items: { include: { product: true, color: true, size: true } } }
          }
        }
      });

      // 3. Reduce customer outstanding balance
      await tx.customer.update({
        where: { id: Number(customerId) },
        data: { outstandingBalance: { decrement: Number(amount) } }
      });

      // 4. If linked to an invoice, update paidAmount and status
      if (invoiceId) {
        const invoice = await tx.salesInvoice.findUnique({ where: { id: Number(invoiceId) } });
        if (invoice) {
          const newPaidAmount = invoice.paidAmount + Number(amount);
          let newStatus = 'PARTIAL';
          let discountAmt = invoice.discountAmount; // Default keep existing
          
          // Use netPayable for threshold, default to totalAmount if 0
          const threshold = invoice.netPayable > 0 ? invoice.netPayable : invoice.totalAmount;
          
          if (newPaidAmount >= threshold) {
            newStatus = 'PAID';
            discountAmt = invoice.proposedDiscountAmt; // lock in the proposed discount
          }
          await tx.salesInvoice.update({
            where: { id: Number(invoiceId) },
            data: { 
              paidAmount: newPaidAmount, 
              status: newStatus,
              discountAmount: discountAmt
            }
          });
        }
      }

      // 5. Auto sync to Finance ledger
      const cashAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Cash', isSystem: true } });
      const arAcc   = await tx.ledgerAccount.findFirst({ where: { name: 'Accounts Receivable', isSystem: true } });

      if (cashAcc && arAcc) {
        await tx.journalTransaction.create({
          data: {
            date: new Date(),
            amount: Number(amount),
            description: `Payment from Customer ID: ${customerId} | Receipt: ${receiptNumber}`,
            reference: receiptNumber,
            debitAccountId: cashAcc.id,
            creditAccountId: arAcc.id
          }
        });
        await tx.ledgerAccount.update({ where: { id: cashAcc.id }, data: { balance: { increment: Number(amount) } } });
        await tx.ledgerAccount.update({ where: { id: arAcc.id  }, data: { balance: { decrement: Number(amount) } } });
      }

      return payment;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('receivePayment error:', error);
    res.status(400).json({ message: 'Error processing payment', error: error.message });
  }
};

// GET /api/sales/payments/:paymentId/receipt
export const getPaymentReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = Number(req.params.paymentId);
    const payment = await prisma.customerPayment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        invoice: {
          include: { items: { include: { product: true, color: true, size: true } } }
        }
      }
    });

    if (!payment) {
      res.status(404).json({ message: 'Receipt not found' });
      return;
    }

    // Compute remaining balance from invoice if linked
    let remainingBalance: number | null = null;
    if (payment.invoice) {
      remainingBalance = payment.invoice.totalAmount - payment.invoice.paidAmount;
    }

    res.json({ ...payment, remainingBalance });
  } catch (error: any) {
    console.error('getPaymentReceipt error:', error);
    res.status(500).json({ message: 'Error fetching receipt', error: error.message });
  }
};

// PATCH /api/sales/invoices/:id/discount
// Sets the proposed discount on the invoice. Does NOT record payment or change status.
export const proposeDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceId = Number(req.params.id);
    const { discountPct, discountAmount } = req.body;

    const invoice = await prisma.salesInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found.' });
      return;
    }
    
    if (invoice.status === 'PAID') {
      res.status(400).json({ message: 'Cannot propose discount on a fully paid invoice.' });
      return;
    }

    let proposedDiscountAmt = 0;
    let pct = Number(discountPct) || 0;

    if (discountAmount !== undefined) {
      proposedDiscountAmt = Number(discountAmount);
    } else {
      proposedDiscountAmt = parseFloat(((pct / 100) * invoice.totalAmount).toFixed(2));
    }

    const remainingBalance = invoice.totalAmount - invoice.paidAmount;
    if (proposedDiscountAmt < 0 || proposedDiscountAmt > remainingBalance) {
      res.status(400).json({ message: `Discount amount cannot exceed the remaining balance of ₹${remainingBalance.toFixed(2)}.` });
      return;
    }

    const netPayable = parseFloat((invoice.totalAmount - proposedDiscountAmt).toFixed(2));

    const updated = await prisma.salesInvoice.update({
      where: { id: invoiceId },
      data: {
        proposedDiscountPct: pct,
        proposedDiscountAmt,
        netPayable
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('proposeDiscount error:', error);
    res.status(500).json({ message: 'Error proposing discount', error: error.message });
  }
};


// GET /api/sales/invoices/:id/settlement-print
// Returns full invoice data including discountAmount for the printable settlement invoice
export const getSettlementInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true, color: true, size: true } },
        payments: { orderBy: { date: 'asc' } }
      }
    });
    if (!invoice) { res.status(404).json({ message: 'Invoice not found' }); return; }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching settlement invoice', error: error.message });
  }
};
