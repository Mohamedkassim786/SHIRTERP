import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Customer Orders ---
export const getCustomerOrders = async (req: Request, res: Response) => {
  try {
    const data = await prisma.customerOrder.findMany({
      include: { customer: true, items: { include: { model: true, color: true, size: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

export const createCustomerOrder = async (req: Request, res: Response) => {
  try {
    const { customerId, deliveryDate, items } = req.body;
    
    const count = await prisma.customerOrder.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const orderItemsData = items.map((item: any) => ({
      modelId: Number(item.modelId),
      colorId: Number(item.colorId),
      sizeId: Number(item.sizeId),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.quantity) * Number(item.unitPrice || 0)
    }));

    const order = await prisma.customerOrder.create({
      data: {
        orderNumber,
        customerId: Number(customerId),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        items: { create: orderItemsData }
      },
      include: { items: true }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error creating order' });
  }
};

// --- Production (Work Orders) ---
export const getProductionDashboard = async (req: Request, res: Response) => {
  try {
    const totalWorkOrders = await prisma.workOrder.count();
    const runningWorkOrders = await prisma.workOrder.count({ where: { status: 'RUNNING' } });
    const completedWorkOrders = await prisma.workOrder.count({ where: { status: 'COMPLETED' } });
    
    // Total target qty of running orders
    const runningOrders = await prisma.workOrder.findMany({ where: { status: 'RUNNING' } });
    const targetRunningQty = runningOrders.reduce((sum, wo) => sum + wo.targetQty, 0);

    res.json({
      totalWorkOrders,
      runningWorkOrders,
      completedWorkOrders,
      targetRunningQty
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching production dashboard stats' });
  }
};

export const getWorkOrders = async (req: Request, res: Response) => {
  try {
    const data = await prisma.workOrder.findMany({
      include: { order: true, stages: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching work orders' });
  }
};

export const createWorkOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    
    const order = await prisma.customerOrder.findUnique({
      where: { id: Number(orderId) },
      include: { items: { include: { model: { include: { boms: true } } } } }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const count = await prisma.workOrder.count();
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const targetQty = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Work Order
      const wo = await tx.workOrder.create({
        data: {
          woNumber,
          orderId: order.id,
          targetQty,
          status: 'RUNNING',
          startDate: new Date()
        }
      });

      // 2. Update Order Status
      await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: 'IN_PRODUCTION' }
      });

      // 3. Deduct Raw Materials based on BOM
      for (const item of order.items) {
        for (const bom of item.model.boms) {
          const materialNeeded = bom.quantityPerUnit * item.quantity;
          
          await tx.rawMaterial.update({
            where: { id: bom.materialId },
            data: { currentStock: { decrement: materialNeeded } }
          });

          await tx.materialStockTransaction.create({
            data: {
              materialId: bom.materialId,
              type: 'OUT',
              quantity: materialNeeded,
              reference: woNumber
            }
          });
        }
      }

      return wo;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error creating work order' });
  }
};

export const addProductionStage = async (req: Request, res: Response) => {
  try {
    const { workOrderId, stageName, qtyIn, qtyOut, rejectedQty } = req.body;
    
    // In a real app, logic ensures qtyOut <= qtyIn, etc.
    const stage = await prisma.productionStage.create({
      data: {
        workOrderId: Number(workOrderId),
        stageName,
        qtyIn: Number(qtyIn),
        qtyOut: Number(qtyOut),
        rejectedQty: Number(rejectedQty)
      }
    });

    // If PACKING stage is done, we might auto-generate Finished Goods.
    // Simplifying: If stage is 'PACKING', we add to FinishedGoods stock.
    if (stageName === 'PACKING') {
      const wo = await prisma.workOrder.findUnique({
        where: { id: Number(workOrderId) },
        include: { order: { include: { items: true } } }
      });

      if (wo) {
        for (const item of wo.order.items) {
          // Assume proportion or exact matching
          await prisma.finishedGood.upsert({
            where: {
              modelId_colorId_sizeId: {
                modelId: item.modelId,
                colorId: item.colorId,
                sizeId: item.sizeId
              }
            },
            update: { quantity: { increment: item.quantity } }, // simplifying: qtyOut applied proportionally in real ERP
            create: {
              modelId: item.modelId,
              colorId: item.colorId,
              sizeId: item.sizeId,
              quantity: item.quantity
            }
          });
        }

        // Mark Work Order as completed
        await prisma.workOrder.update({
          where: { id: wo.id },
          data: { status: 'COMPLETED', endDate: new Date() }
        });

        // Mark Customer Order as READY for invoicing/delivery
        await prisma.customerOrder.update({
          where: { id: wo.orderId },
          data: { status: 'READY' }
        });
      }
    }

    res.status(201).json(stage);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error adding production stage' });
  }
};

// --- Finished Goods ---
export const getFinishedGoods = async (req: Request, res: Response) => {
  try {
    const data = await prisma.finishedGood.findMany({
      include: { model: true, color: true, size: true }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching finished goods' });
  }
};
