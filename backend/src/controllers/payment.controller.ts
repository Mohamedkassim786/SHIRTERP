import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/payments/create-order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { amount, receipt, notes } = req.body;
    
    const settings = await prisma.companySettings.findFirst();
    const key_id = settings?.razorpayKeyId?.trim() || process.env.RAZORPAY_KEY_ID?.trim();
    const key_secret = settings?.razorpaySecret?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!key_id || !key_secret) {
      return res.status(400).json({ message: 'Razorpay keys are not configured in Settings. Please add them to enable online payments.' });
    }

    const instance = new Razorpay({ key_id, key_secret });

    // Razorpay amount is in paise (1 INR = 100 paise)
    const options = {
      amount: Math.round(Number(amount) * 100), 
      currency: 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {}
    };

    const order = await instance.orders.create(options);
    res.json(order);
  } catch (error: any) {
    console.error('Razorpay Error:', error);
    const reason = error.error?.description || error.message || 'Unknown error';
    res.status(500).json({ message: `Razorpay Error: ${reason}` });
  }
};

// POST /api/payments/verify
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, customerId, amount } = req.body;

    const settings = await prisma.companySettings.findFirst();
    const keySecret = settings?.razorpaySecret?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim();
    
    if (!keySecret) {
      return res.status(400).json({ message: 'Razorpay Secret is missing.' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // --- Verification successful, now update ERP records ---
    const result = await prisma.$transaction(async (tx) => {
      // 1. Log Customer Payment
      const payment = await tx.customerPayment.create({
        data: {
          customerId: Number(customerId),
          amount: Number(amount),
          method: 'RAZORPAY',
          reference: razorpay_payment_id
        }
      });

      // 2. Reduce Customer Outstanding Balance
      await tx.customer.update({
        where: { id: Number(customerId) },
        data: { outstandingBalance: { decrement: Number(amount) } }
      });

      // 3. Mark Invoice as PAID
      if (invoiceId) {
        await tx.salesInvoice.update({
          where: { id: Number(invoiceId) },
          data: { status: 'PAID' }
        });
      }

      // 4. Auto Sync to Finance (Daybook/Ledger)
      const cashAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Bank Account', isSystem: true } }) 
                   || await tx.ledgerAccount.findFirst({ where: { name: 'Cash', isSystem: true } });
      const arAcc = await tx.ledgerAccount.findFirst({ where: { name: 'Accounts Receivable', isSystem: true } });
      
      if (cashAcc && arAcc) {
        // Customer Payment: Debit Bank (increase asset), Credit Accounts Receivable (decrease asset)
        await tx.journalTransaction.create({
          data: {
            date: new Date(),
            amount: Number(amount),
            description: `Online Payment from Customer ID: ${customerId} via Razorpay`,
            reference: razorpay_payment_id,
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

    res.json({ message: 'Payment verified and ERP updated successfully', payment: result });
  } catch (error: any) {
    console.error('Verify Error:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};
