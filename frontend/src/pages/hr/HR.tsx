import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {  Users, Calendar, CheckCircle, XCircle, DollarSign  } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

type Tab = 'employees' | 'attendance' | 'leave' | 'payroll';

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800', ABSENT: 'bg-red-100 text-red-800',
  HALF_DAY: 'bg-yellow-100 text-yellow-800', LEAVE: 'bg-blue-100 text-blue-800', NOT_MARKED: 'bg-white text-slate-400'
};

export default function HR() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('employees');
  const [isEmpOpen, setIsEmpOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [empForm, setEmpForm] = useState({ name: '', phone: '', designation: '', departmentId: '', salary: '', email: '' });
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, string>>({});
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payOpen, setPayOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [payForm, setPayForm] = useState({ deductions: '0', bonus: '0', method: 'BANK' });

  const { data: employees = [] } = useQuery({ queryKey: ['hr-employees'], queryFn: async () => (await api.get('/hr/employees')).data, retry: 1 });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: async () => (await api.get('/masters/departments')).data, retry: 1 });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance', attendanceDate], queryFn: async () => (await api.get(`/hr/attendance?date=${attendanceDate}`)).data, retry: 1,
    onSuccess: (data: any[]) => {
      const map: Record<number, string> = {};
      data.forEach((e: any) => { map[e.id] = e.attendance?.status || 'PRESENT'; });
      setAttendanceRecords(map);
    }
  } as any);
  const { data: leaves = [] } = useQuery({ queryKey: ['leaves'], queryFn: async () => (await api.get('/hr/leave')).data, retry: 1 });
  const { data: payroll = [] } = useQuery({ queryKey: ['payroll', payMonth, payYear], queryFn: async () => (await api.get(`/hr/payroll?month=${payMonth}&year=${payYear}`)).data, retry: 1 });

  const empMutation = useMutation({
    mutationFn: (data: any) => editEmp ? api.put(`/hr/employees/${editEmp.id}`, data) : api.post('/hr/employees', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hr-employees'] }); setIsEmpOpen(false); }
  });

  const attMutation = useMutation({
    mutationFn: () => api.post('/hr/attendance', {
      date: attendanceDate,
      records: Object.entries(attendanceRecords).map(([empId, status]) => ({ employeeId: Number(empId), status }))
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance'] }); alert('Attendance saved!'); }
  });

  const leaveMutation = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/hr/leave/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] })
  });

  const generatePayrollMutation = useMutation({
    mutationFn: () => api.post('/hr/payroll/generate', { month: payMonth, year: payYear }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll'] })
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => api.put(`/hr/payroll/${id}/pay`, { ...payForm, netPay: (selectedSalary?.baseSalary || 0) - Number(payForm.deductions) + Number(payForm.bonus) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll'] }); setPayOpen(false); }
  });

  const openEmpDialog = (emp?: any) => {
    if (emp) { setEditEmp(emp); setEmpForm({ name: emp.name, phone: emp.phone || '', designation: emp.designation || '', departmentId: String(emp.departmentId || ''), salary: String(emp.salary || ''), email: emp.email || '' }); }
    else { setEditEmp(null); setEmpForm({ name: '', phone: '', designation: '', departmentId: '', salary: '', email: '' }); }
    setIsEmpOpen(true);
  };

  const tabs: Tab[] = ['employees', 'attendance', 'leave', 'payroll'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t('hr.title', 'HR & Payroll')}</h1>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)} className={`px-4 py-2 rounded-t-lg font-medium text-sm capitalize ${tab === tabKey ? 'bg-primary text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-200'}`}>
            {tabKey === 'employees' && <Users className="h-4 w-4 inline mr-1" />}
            {tabKey === 'attendance' && <Calendar className="h-4 w-4 inline mr-1" />}
            {tabKey === 'payroll' && <DollarSign className="h-4 w-4 inline mr-1" />}
            {t(`hr.tabs.${tabKey}`, tabKey.charAt(0).toUpperCase() + tabKey.slice(1))}
          </button>
        ))}
      </div>

      {/* EMPLOYEES */}
      {tab === 'employees' && (
        <DataTable
          columns={[
            { key: 'name', label: t('hr.cols.name', 'Name') },
            { key: 'designation', label: t('hr.cols.designation', 'Designation') },
            { key: 'department', label: t('hr.cols.department', 'Department'), render: (r: any) => r.department?.name || '-' },
            { key: 'phone', label: t('customers.cols.phone', 'Phone') },
            { key: 'salary', label: t('hr.cols.salary', 'Salary'), render: (r: any) => `₹${r.salary?.toLocaleString('en-IN')}` },
            { key: 'isActive', label: t('customers.cols.status', 'Status'), render: (r: any) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
          ]}
          data={employees} searchKey="name" onAdd={() => openEmpDialog()} onEdit={openEmpDialog}
        />
      )}

      {/* ATTENDANCE */}
      {tab === 'attendance' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('hr.attendance.title', 'Daily Attendance')}</CardTitle>
            <div className="flex gap-3 items-center">
              <AnimatedInput type="date" className="w-40" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
              <Button onClick={() => attMutation.mutate()} disabled={attMutation.isPending}>{t('hr.attendance.save', 'Save Attendance')}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(attendance as any[]).map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.designation} • {emp.department?.name}</p>
                  </div>
                  <div className="flex gap-1">
                    {['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'].map(s => (
                      <button key={s} onClick={() => setAttendanceRecords({ ...attendanceRecords, [emp.id]: s })}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${attendanceRecords[emp.id] === s ? STATUS_COLORS[s] + ' border-current' : 'border-slate-200 text-slate-500 hover:bg-white'}`}>
                        {t(`hr.attendance.${s.toLowerCase()}`, s === 'HALF_DAY' ? 'Half' : s.charAt(0) + s.slice(1).toLowerCase())}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LEAVE REQUESTS */}
      {tab === 'leave' && (
        <div className="space-y-3">
          {leaves.length === 0 && <p className="text-slate-400 text-center py-8">No leave requests found.</p>}
          {leaves.map((leave: any) => (
            <Card key={leave.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{leave.employee?.name}</p>
                  <p className="text-sm text-slate-400">{new Date(leave.fromDate).toLocaleDateString('en-IN')} → {new Date(leave.toDate).toLocaleDateString('en-IN')}</p>
                  <p className="text-sm text-slate-400 mt-1">{leave.reason}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={leave.status === 'APPROVED' ? 'default' : leave.status === 'REJECTED' ? 'destructive' : 'secondary'}>{leave.status}</Badge>
                  {leave.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => leaveMutation.mutate({ id: leave.id, status: 'APPROVED' })}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => leaveMutation.mutate({ id: leave.id, status: 'REJECTED' })}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PAYROLL */}
      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div><Label className="text-xs">{t('hr.payroll.month', 'Month')}</Label>
              <AnimatedSelect className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={payMonth} onChange={e => setPayMonth(Number(e.target.value))}>
                {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(2024, i, 1).toLocaleString('en-IN', { month: 'long' })}</option>)}
              </AnimatedSelect>
            </div>
            <div><Label className="text-xs">{t('hr.payroll.year', 'Year')}</Label><AnimatedInput type="number" className="w-24" value={payYear} onChange={e => setPayYear(Number(e.target.value))} /></div>
            <Button variant="outline" onClick={() => generatePayrollMutation.mutate()} disabled={generatePayrollMutation.isPending}>{t('hr.payroll.generate', 'Generate Payroll')}</Button>
          </div>
          <DataTable
            columns={[
              { key: 'employee', label: t('hr.cols.employee', 'Employee'), render: (r: any) => r.employee?.name },
              { key: 'department', label: t('hr.cols.department', 'Department'), render: (r: any) => r.employee?.department?.name || '-' },
              { key: 'baseSalary', label: t('hr.cols.baseSalary', 'Base Salary'), render: (r: any) => `₹${r.baseSalary?.toLocaleString('en-IN')}` },
              { key: 'deductions', label: t('hr.cols.deductions', 'Deductions'), render: (r: any) => <span className="text-red-500">-₹{r.deductions}</span> },
              { key: 'bonus', label: t('hr.cols.bonus', 'Bonus'), render: (r: any) => <span className="text-green-600">+₹{r.bonus}</span> },
              { key: 'netPay', label: t('hr.cols.netPay', 'Net Pay'), render: (r: any) => <span className="font-bold">₹{r.netPay?.toLocaleString('en-IN')}</span> },
              { key: 'status', label: t('customers.cols.status', 'Status'), render: (r: any) => <Badge variant={r.status === 'PAID' ? 'default' : 'secondary'}>{String(t(`hr.payroll.status.${r.status}`, r.status))}</Badge> },
              { key: 'action', label: '', render: (r: any) => r.status !== 'PAID' ? (
                <Button size="sm" onClick={() => { setSelectedSalary(r); setPayForm({ deductions: String(r.deductions), bonus: String(r.bonus), method: 'BANK' }); setPayOpen(true); }}>{t('hr.payroll.markPaid', 'Mark Paid')}</Button>
              ) : <span className="text-xs text-green-600">✓ {t('hr.payroll.paid', 'Paid')}</span> }
            ]}
            data={payroll} searchKey="employee"
          />
        </div>
      )}

      {/* Employee Dialog */}
      <Dialog open={isEmpOpen} onOpenChange={setIsEmpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editEmp ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); empMutation.mutate({ ...empForm, salary: Number(empForm.salary), departmentId: empForm.departmentId ? Number(empForm.departmentId) : undefined }); }} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><AnimatedInput required value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('common.phone', 'Phone')}</Label><AnimatedInput value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Designation</Label><AnimatedInput value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} /></div>
              <div className="space-y-2"><Label>Department</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={empForm.departmentId} onChange={e => setEmpForm({ ...empForm, departmentId: e.target.value })}>
                  <option value="">Select</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </AnimatedSelect>
              </div>
              <div className="space-y-2"><Label>Monthly Salary (₹)</Label><AnimatedInput type="number" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('common.email', 'Email')}</Label><AnimatedInput type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsEmpOpen(false)}>{t('common.cancel', 'Cancel')}</Button><Button type="submit">{t('common.save', 'Save')}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Salary Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Salary as Paid — {selectedSalary?.employee?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50/50 rounded-lg text-sm">
              <div><span className="text-slate-400">Base Salary</span><p className="font-bold">₹{selectedSalary?.baseSalary?.toLocaleString('en-IN')}</p></div>
              <div><span className="text-slate-400">Net Pay</span><p className="font-bold text-primary">₹{((selectedSalary?.baseSalary || 0) - Number(payForm.deductions) + Number(payForm.bonus)).toLocaleString('en-IN')}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Deductions (₹)</Label><AnimatedInput type="number" min="0" value={payForm.deductions} onChange={e => setPayForm({ ...payForm, deductions: e.target.value })} /></div>
              <div className="space-y-2"><Label>Bonus (₹)</Label><AnimatedInput type="number" min="0" value={payForm.bonus} onChange={e => setPayForm({ ...payForm, bonus: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Payment Method</Label>
              <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                <option value="BANK">Bank Transfer</option><option value="CASH">Cash</option><option value="UPI">UPI</option>
              </AnimatedSelect>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => markPaidMutation.mutate(selectedSalary?.id)} disabled={markPaidMutation.isPending}>Confirm Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
