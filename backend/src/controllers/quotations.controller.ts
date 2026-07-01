import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Quotations ────────────────────────────────────────────────────────────────
export const getQuotations = async (_req: Request, res: Response) => {
  const data = await prisma.quotation.findMany({
    include: { customer: true, items: { include: { model: true, color: true, size: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(data);
};

export const createQuotation = async (req: Request, res: Response) => {
  try {
    const { customerId, validUntil, notes, items } = req.body;
    const count = await prisma.quotation.count();
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subTotal = 0, gstAmount = 0;
    const itemsData = items.map((i: any) => {
      const lineTotal = Number(i.quantity) * Number(i.unitPrice);
      const lineGst = lineTotal * (Number(i.gstPercent || 5) / 100);
      subTotal += lineTotal; gstAmount += lineGst;
      return { modelId: Number(i.modelId), colorId: Number(i.colorId), sizeId: Number(i.sizeId), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), gstPercent: Number(i.gstPercent || 5), totalPrice: lineTotal + lineGst };
    });

    const data = await prisma.quotation.create({
      data: { quotationNumber, customerId: Number(customerId), validUntil: validUntil ? new Date(validUntil) : null, notes, subTotal, gstAmount, totalAmount: subTotal + gstAmount, items: { create: itemsData } },
      include: { customer: true, items: true }
    });
    res.status(201).json(data);
  } catch (e) { console.error(e); res.status(400).json({ message: 'Error creating quotation' }); }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
  try {
    const data = await prisma.quotation.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } });
    res.json(data);
  } catch { res.status(400).json({ message: 'Error updating status' }); }
};

export const convertToOrder = async (req: Request, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true }
    });
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

    const count = await prisma.customerOrder.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.customerOrder.create({
        data: {
          orderNumber, customerId: quotation.customerId,
          deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
          items: {
            create: quotation.items.map(i => ({
              modelId: i.modelId, colorId: i.colorId, sizeId: i.sizeId,
              quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice
            }))
          }
        }
      });
      await tx.quotation.update({ where: { id: quotation.id }, data: { status: 'ACCEPTED', convertedOrderId: newOrder.id } });
      return newOrder;
    });
    res.status(201).json(order);
  } catch (e) { console.error(e); res.status(400).json({ message: 'Error converting to order' }); }
};
