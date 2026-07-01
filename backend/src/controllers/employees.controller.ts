import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getEmployees = async (req: Request, res: Response) => {
  const data = await prisma.employee.findMany({ 
    include: { department: true },
    orderBy: { name: 'asc' } 
  });
  res.json(data);
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const data = await prisma.employee.create({ data: req.body });
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: 'Error creating employee' });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await prisma.employee.update({ where: { id: Number(id) }, data: req.body });
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: 'Error updating employee' });
  }
};
