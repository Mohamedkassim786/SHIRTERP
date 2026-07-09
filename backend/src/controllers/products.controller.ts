import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// PRODUCTS
// -----------------------------------------------------------------------------

export const getProducts = async (req: Request, res: Response) => {
  try {
    const data = await prisma.product.findMany({ 
      include: { category: true, boms: { include: { rawMaterial: true } } },
      orderBy: { createdAt: 'desc' } 
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { boms, ...modelData } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    let bomsArray = [];
    if (boms) {
      bomsArray = typeof boms === 'string' ? JSON.parse(boms) : boms;
    }

    const data = await prisma.product.create({ 
      data: {
        ...modelData,
        categoryId: Number(modelData.categoryId),
        imageUrl,
        boms: {
          create: bomsArray.map((b: any) => ({
            materialId: Number(b.materialId),
            quantityPerUnit: Number(b.quantityPerUnit)
          }))
        }
      },
      include: { category: true, boms: { include: { rawMaterial: true } } }
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product' });
  }
};

// -----------------------------------------------------------------------------
// RAW MATERIALS & INVENTORY
// -----------------------------------------------------------------------------

export const getRawMaterials = async (req: Request, res: Response) => {
  try {
    const data = await prisma.rawMaterial.findMany({ 
      include: { unit: true },
      orderBy: { name: 'asc' }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching raw materials' });
  }
};

export const createRawMaterial = async (req: Request, res: Response) => {
  try {
    const data = await prisma.rawMaterial.create({ 
      data: {
        name: req.body.name,
        unitId: Number(req.body.unitId),
        minStockLevel: Number(req.body.minStockLevel) || 0,
        currentStock: Number(req.body.currentStock) || 0,
        location: req.body.location || null
      },
      include: { unit: true }
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: 'Error creating raw material' });
  }
};

export const updateRawMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await prisma.rawMaterial.update({ 
      where: { id: Number(id) }, 
      data: {
        name: req.body.name,
        unitId: Number(req.body.unitId),
        minStockLevel: Number(req.body.minStockLevel) || 0,
        location: req.body.location || null
      },
      include: { unit: true }
    });
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: 'Error updating raw material' });
  }
};

// -----------------------------------------------------------------------------
// INVENTORY STOCK ADJUSTMENTS
// -----------------------------------------------------------------------------

export const getInventoryDashboard = async (req: Request, res: Response) => {
  const materials = await prisma.rawMaterial.findMany();
  const lowStockMaterials = materials.filter((m: any) => m.currentStock <= m.minStockLevel);
  
  res.json({
    totalItems: materials.length,
    lowStockCount: lowStockMaterials.length,
    lowStockItems: lowStockMaterials
  });
};

export const getMaterialHistory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const material = await prisma.rawMaterial.findUnique({
    where: { id: Number(id) },
    include: { unit: true }
  });

  if (!material) return res.status(404).json({ message: 'Material not found' });

  const history = await prisma.materialStockTransaction.findMany({
    where: { materialId: Number(id) },
    orderBy: { date: 'desc' }
  });

  res.json({ ...material, history });
};

export const adjustStock = async (req: Request, res: Response) => {
  const { materialId, type, quantity, reference, batchNumber, notes } = req.body;
  const qty = Number(quantity);

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Ledger Entry
      const txn = await tx.materialStockTransaction.create({
        data: {
          materialId: Number(materialId),
          type, // "IN" or "OUT"
          quantity: qty,
          reference: reference || 'MANUAL',
          batchNumber,
          notes
        }
      });

      // 2. Update Current Balance
      const updatedMaterial = await tx.rawMaterial.update({
        where: { id: Number(materialId) },
        data: {
          currentStock: type === 'IN' ? { increment: qty } : { decrement: qty }
        }
      });

      // Prevent negative stock
      if (updatedMaterial.currentStock < 0) {
        throw new Error('Insufficient stock for this OUT transaction');
      }

      return { txn, updatedMaterial };
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error adjusting stock' });
  }
};
