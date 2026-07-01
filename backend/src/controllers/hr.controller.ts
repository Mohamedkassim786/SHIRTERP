import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Employees ─────────────────────────────────────────────────────────────────
export const getEmployees = async (_req: Request, res: Response) => {
  const data = await prisma.employee.findMany({ include: { department: true }, orderBy: { name: 'asc' } });
  res.json(data);
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const data = await prisma.employee.create({ data: { ...req.body, salary: Number(req.body.salary), departmentId: req.body.departmentId ? Number(req.body.departmentId) : null }, include: { department: true } });
    res.status(201).json(data);
  } catch (e) { console.error(e); res.status(400).json({ message: 'Error creating employee' }); }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const data = await prisma.employee.update({ where: { id: Number(req.params.id) }, data: { ...req.body, salary: req.body.salary ? Number(req.body.salary) : undefined, departmentId: req.body.departmentId ? Number(req.body.departmentId) : undefined }, include: { department: true } });
    res.json(data);
  } catch { res.status(400).json({ message: 'Error updating employee' }); }
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendance = async (req: Request, res: Response) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, include: { department: true }, orderBy: { name: 'asc' } }),
    prisma.attendance.findMany({ where: { date: { gte: dayStart, lte: dayEnd } }, include: { employee: true } })
  ]);

  const recordMap: Record<number, any> = {};
  records.forEach(r => { recordMap[r.employeeId] = r; });

  const result = employees.map(emp => ({
    ...emp,
    attendance: recordMap[emp.id] || { status: 'NOT_MARKED', employeeId: emp.id, date: targetDate }
  }));
  res.json(result);
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { date, records } = req.body; // records: [{employeeId, status, checkIn, checkOut}]
    const targetDate = new Date(date);
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const results = await prisma.$transaction(
      records.map((r: any) =>
        prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: Number(r.employeeId), date: dayStart } },
          update: { status: r.status, checkIn: r.checkIn, checkOut: r.checkOut, notes: r.notes },
          create: { employeeId: Number(r.employeeId), date: dayStart, status: r.status, checkIn: r.checkIn, checkOut: r.checkOut, notes: r.notes }
        })
      )
    );
    res.json(results);
  } catch (e) { console.error(e); res.status(400).json({ message: 'Error marking attendance' }); }
};

export const getAttendanceSummary = async (req: Request, res: Response) => {
  const { month, year, employeeId } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);

  const where: any = { date: { gte: from, lte: to } };
  if (employeeId) where.employeeId = Number(employeeId);

  const records = await prisma.attendance.findMany({ where, include: { employee: true } });
  res.json(records);
};

// ── Leave Requests ────────────────────────────────────────────────────────────
export const getLeaveRequests = async (_req: Request, res: Response) => {
  const data = await prisma.leaveRequest.findMany({ include: { employee: true }, orderBy: { createdAt: 'desc' } });
  res.json(data);
};

export const createLeaveRequest = async (req: Request, res: Response) => {
  try {
    const data = await prisma.leaveRequest.create({
      data: { employeeId: Number(req.body.employeeId), fromDate: new Date(req.body.fromDate), toDate: new Date(req.body.toDate), reason: req.body.reason },
      include: { employee: true }
    });
    res.status(201).json(data);
  } catch (e) { res.status(400).json({ message: 'Error creating leave request' }); }
};

export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const data = await prisma.leaveRequest.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status, approvedBy: req.body.approvedBy } });
    res.json(data);
  } catch { res.status(400).json({ message: 'Error updating leave' }); }
};

// ── Salary / Payroll ──────────────────────────────────────────────────────────
export const getSalaryPayments = async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const where: any = {};
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  const data = await prisma.salaryPayment.findMany({ where, include: { employee: { include: { department: true } } }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  res.json(data);
};

export const generatePayroll = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.body;
    const employees = await prisma.employee.findMany({ where: { isActive: true } });

    const from = new Date(Number(year), Number(month) - 1, 1);
    const to = new Date(Number(year), Number(month), 0, 23, 59, 59);
    const workingDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const results = await prisma.$transaction(
      employees.map(emp =>
        prisma.salaryPayment.upsert({
          where: { employeeId_month_year: { employeeId: emp.id, month: Number(month), year: Number(year) } },
          update: {},
          create: { employeeId: emp.id, month: Number(month), year: Number(year), baseSalary: emp.salary, deductions: 0, bonus: 0, netPay: emp.salary, status: 'PENDING' }
        })
      )
    );
    res.json(results);
  } catch (e) { console.error(e); res.status(400).json({ message: 'Error generating payroll' }); }
};

export const markSalaryPaid = async (req: Request, res: Response) => {
  try {
    const data = await prisma.salaryPayment.update({
      where: { id: Number(req.params.id) },
      data: { status: 'PAID', paidDate: new Date(), paidMethod: req.body.method || 'BANK', deductions: Number(req.body.deductions) || 0, bonus: Number(req.body.bonus) || 0, netPay: Number(req.body.netPay) },
      include: { employee: true }
    });
    res.json(data);
  } catch { res.status(400).json({ message: 'Error marking salary paid' }); }
};
