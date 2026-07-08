import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/eway-bills
export const getEWayBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const bills = await prisma.eWayBill.findMany({
      include: { invoice: { select: { invoiceNumber: true, totalAmount: true, customer: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bills);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching E-Way Bills', error: error.message });
  }
};

// GET /api/eway-bills/:id
export const getEWayBillById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const bill = await prisma.eWayBill.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customer: true,
            items: { include: { model: true, color: true, size: true } },
          },
        },
      },
    });
    if (!bill) { res.status(404).json({ message: 'E-Way Bill not found' }); return; }
    res.json(bill);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching E-Way Bill', error: error.message });
  }
};

// POST /api/eway-bills
export const createEWayBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      invoiceId, sellerGst, buyerGst, buyerName, buyerAddress,
      vehicleNumber, transporterName, transporterId,
      fromPlace, toPlace, distance, transportMode,
      goodsDescription, totalValue, hsnCode, validUntil,
    } = req.body;

    if (!sellerGst || !vehicleNumber || !fromPlace || !toPlace) {
      res.status(400).json({ message: 'sellerGst, vehicleNumber, fromPlace and toPlace are required.' });
      return;
    }

    // Auto-generate EWB number: EWB-YYYY-NNNN
    const count = await prisma.eWayBill.count();
    const year = new Date().getFullYear();
    const ewbNumber = `EWB-${year}-${String(count + 1).padStart(4, '0')}`;

    // Validity: 1 day per 100 km (min 1 day), if not provided
    let validity = validUntil ? new Date(validUntil) : null;
    if (!validity && distance) {
      const days = Math.max(1, Math.ceil(Number(distance) / 100));
      validity = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const bill = await prisma.eWayBill.create({
      data: {
        ewbNumber,
        invoiceId:        invoiceId ? Number(invoiceId) : null,
        sellerGst,
        buyerGst:         buyerGst || null,
        buyerName:        buyerName || null,
        buyerAddress:     buyerAddress || null,
        vehicleNumber:    vehicleNumber.toUpperCase(),
        transporterName:  transporterName || null,
        transporterId:    transporterId || null,
        fromPlace,
        toPlace,
        distance:         distance ? Number(distance) : null,
        transportMode:    transportMode || 'ROAD',
        goodsDescription: goodsDescription || null,
        totalValue:       Number(totalValue) || 0,
        hsnCode:          hsnCode || null,
        validUntil:       validity,
      },
      include: {
        invoice: { select: { invoiceNumber: true, customer: true } },
      },
    });

    res.status(201).json(bill);
  } catch (error: any) {
    console.error('createEWayBill error:', error);
    res.status(400).json({ message: 'Error creating E-Way Bill', error: error.message });
  }
};

// PATCH /api/eway-bills/:id/cancel
export const cancelEWayBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const bill = await prisma.eWayBill.findUnique({ where: { id } });
    if (!bill) { res.status(404).json({ message: 'E-Way Bill not found' }); return; }
    if (bill.status === 'CANCELLED') { res.status(400).json({ message: 'Already cancelled.' }); return; }

    const updated = await prisma.eWayBill.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Error cancelling E-Way Bill', error: error.message });
  }
};
