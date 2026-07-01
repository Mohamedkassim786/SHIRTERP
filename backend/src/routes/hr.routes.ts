import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getEmployees, createEmployee, updateEmployee, getAttendance, markAttendance, getAttendanceSummary, getLeaveRequests, createLeaveRequest, updateLeaveStatus, getSalaryPayments, generatePayroll, markSalaryPaid } from '../controllers/hr.controller';

const router = Router();
router.use(authenticate);

// Employees
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);

// Attendance
router.get('/attendance', getAttendance);
router.post('/attendance', markAttendance);
router.get('/attendance/summary', getAttendanceSummary);

// Leave
router.get('/leave', getLeaveRequests);
router.post('/leave', createLeaveRequest);
router.put('/leave/:id', updateLeaveStatus);

// Payroll
router.get('/payroll', getSalaryPayments);
router.post('/payroll/generate', generatePayroll);
router.put('/payroll/:id/pay', markSalaryPaid);

export default router;
