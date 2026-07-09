import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const data = await prisma.purchaseOrder.findMany({
      include: { supplier: true, items: { include: { material: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase orders' });
  }
};

export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { supplierId, items, notes } = req.body;
    
    // Auto-generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let totalAmount = 0;
    const poItemsData = items.map((item: any) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return {
        materialId: item.materialId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: Number(supplierId),
        notes,
        totalAmount,
        items: {
          create: poItemsData
        }
      },
      include: { items: true, supplier: true }
    });

    res.status(201).json(po);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error creating purchase order' });
  }
};

export const createGRN = async (req: Request, res: Response) => {
  try {
    const { poId, notes } = req.body;
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: Number(poId) },
      include: { items: true }
    });

    if (!po) return res.status(404).json({ message: 'PO not found' });

    // Generate GRN Number
    const count = await prisma.gRN.count();
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Transaction to create GRN, update PO status, and increase Material Stock
    const result = await prisma.$transaction(async (tx) => {
      const grn = await tx.gRN.create({
        data: {
          grnNumber,
          poId: po.id,
          notes
        }
      });

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'COMPLETED' }
      });

      // Increase stock for each material and log transaction
      for (const item of po.items) {
        await tx.rawMaterial.update({
          where: { id: item.materialId },
          data: { currentStock: { increment: item.quantity } }
        });

        await tx.materialStockTransaction.create({
          data: {
            materialId: item.materialId,
            type: 'IN',
            quantity: item.quantity,
            reference: grnNumber
          }
        });
      }

      // Generate Purchase Invoice automatically
      const invCount = await tx.purchaseInvoice.count();
      const invNumber = `PINV-${new Date().getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;
      
      await tx.purchaseInvoice.create({
        data: {
          invoiceNumber: invNumber,
          grnId: grn.id,
          total: po.totalAmount,
          date: new Date(),
          status: 'UNPAID'
        }
      });

      // Increase Supplier's outstanding balance
      await tx.supplier.update({
        where: { id: po.supplierId },
        data: { outstandingBalance: { increment: po.totalAmount } }
      });

      return grn;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error processing GRN' });
  }
};
