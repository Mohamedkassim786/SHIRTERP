import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generateCrud = (modelName: string) => {
  const model = (prisma as any)[modelName];
  return {
    getAll: async (req: Request, res: Response) => {
      try {
        const data = await model.findMany();
        res.json(data);
      } catch (error) {
        res.status(500).json({ message: `Error fetching ${modelName}` });
      }
    },
    create: async (req: Request, res: Response) => {
      try {
        const data = await model.create({ data: req.body });
        res.status(201).json(data);
      } catch (error) {
        res.status(400).json({ message: `Error creating ${modelName}` });
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const data = await model.update({ where: { id: Number(id) }, data: req.body });
        res.json(data);
      } catch (error) {
        res.status(400).json({ message: `Error updating ${modelName}` });
      }
    },
    delete: async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        await model.delete({ where: { id: Number(id) } });
        res.json({ message: 'Deleted successfully' });
      } catch (error) {
        res.status(400).json({ message: `Error deleting ${modelName}` });
      }
    }
  };
};

export const sizes = generateCrud('size');
export const colors = generateCrud('color');
export const units = generateCrud('unit');
export const departments = generateCrud('department');
export const categories = generateCrud('category');
