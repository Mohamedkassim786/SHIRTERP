import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, Building2, Users, ClipboardList, Database, Check, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

type SettingsTab = 'company' | 'users' | 'logs' | 'backups';

interface TabItem {
  key: SettingsTab;
  label: string;
  fallback: string;
  icon: any;
}

const masterTabs: TabItem[] = [
  { key: 'company', label: 'settings.tabs.company', fallback: 'Company Profile', icon: Building2 },
  { key: 'users',   label: 'settings.tabs.users', fallback: 'User Management', icon: Users },
  { key: 'logs',    label: 'settings.tabs.logs', fallback: 'Activity Logs', icon: ClipboardList },
  { key: 'backups', label: 'settings.tabs.backups', fallback: 'Database Backup', icon: Database },
];


function CompanySettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['company-settings'], queryFn: async () => (await api.get('/admin/settings')).data, retry: 1 });
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put('/admin/settings', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['company-settings'] }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  });

  const current = { ...(settings || {}), ...form };

  const fields = [
    { key: 'companyName', label: t('settings.companyName', 'Company Name'), required: true },
    { key: 'address', label: t('settings.address', 'Address') }, { key: 'phone', label: t('settings.phone', 'Phone') },
    { key: 'email', label: t('settings.email', 'Email'), type: 'email' }, { key: 'gstin', label: t('settings.gstin', 'GSTIN') },
    { key: 'cin', label: t('settings.cin', 'CIN') }, { key: 'invoicePrefix', label: t('settings.invoicePrefix', 'Invoice Prefix (e.g. INV)') },
    { key: 'invoiceFooter', label: t('settings.invoiceFooter', 'Invoice Footer Text') }, { key: 'termsConditions', label: t('settings.termsConditions', 'Terms & Conditions') },
    { key: 'bankDetails', label: t('settings.bankDetails', 'Bank Details for Invoice') },
    { key: 'razorpayKeyId', label: t('settings.razorpayKeyId', 'Razorpay Key ID (for Payment Link)') },
    { key: 'razorpaySecret', label: t('settings.razorpaySecret', 'Razorpay Secret'), type: 'password' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('settings.companyProfile', 'Company Profile')}</CardTitle>
        {saved && (
          <span className="text-green-600 text-sm font-medium flex items-center gap-1 animate-fade-in">
            <Check className="h-4 w-4" /> {t('common.saved', 'Saved!')}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.key} className={`space-y-2 ${['address', 'invoiceFooter', 'termsConditions', 'bankDetails'].includes(f.key) ? 'sm:col-span-2' : ''}`}>
              <Label>{f.label}</Label>
              <AnimatedInput type={f.type || 'text'} required={f.required} value={current[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => mutation.mutate(current)} disabled={mutation.isPending}><Save className="h-4 w-4 mr-2" />{mutation.isPending ? t('common.saving', 'Saving...') : t('settings.save', 'Save Settings')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/admin/users')).data, retry: 1 });
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/admin/roles')).data, retry: 1 });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setIsOpen(false); setForm({ name: '', email: '', password: '', roleId: '' }); },
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating user')
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive, name, roleId }: any) => api.put(`/admin/users/${id}`, { name, isActive: !isActive, roleId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('settings.users.title', 'User Management')}</CardTitle>
        <Button size="sm" onClick={() => setIsOpen(true)}>+ {t('settings.users.addUser', 'Add User')}</Button>
      </CardHeader>
      <CardContent>
        <DataTable columns={[
          { key: 'name', label: t('settings.users.cols.name', 'Name') },
          { key: 'email', label: t('settings.users.cols.email', 'Email') },
          { key: 'role', label: t('settings.users.cols.role', 'Role'), render: (r: any) => <Badge>{r.role?.name}</Badge> },
          { key: 'isActive', label: t('settings.users.cols.status', 'Status'), render: (r: any) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? t('settings.users.status.active', 'Active') : t('settings.users.status.inactive', 'Inactive')}</Badge> },
          { key: 'actions', label: '', render: (r: any) => <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate(r)}>{r.isActive ? t('settings.users.deactivate', 'Deactivate') : t('settings.users.activate', 'Activate')}</Button> },
        ]} data={users} searchKey="name" />
      </CardContent>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('settings.users.addNew', 'Add New User')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, roleId: Number(form.roleId) }); }} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('settings.users.cols.name', 'Name')} *</Label><AnimatedInput required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('settings.users.cols.email', 'Email')} *</Label><AnimatedInput type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('settings.users.password', 'Password')} *</Label><AnimatedInput type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('settings.users.cols.role', 'Role')} *</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} required>
                  <option value="">{t('settings.users.selectRole', 'Select Role')}</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </AnimatedSelect>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('common.cancel', 'Cancel')}</Button><Button type="submit">{t('settings.users.createUser', 'Create User')}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ActivityLogsSection() {
  const { t } = useTranslation();
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['activity-logs'], queryFn: async () => (await api.get('/system/logs')).data, retry: 1 });

  const formatEntity = (entity: string) => {
    if (entity.startsWith('sales/invoices')) {
      const p = entity.split('/');
      if (p.length === 2) return t('settings.logs.entities.invoices', 'Invoices');
      if (p.length === 3) return `${t('settings.logs.entities.invoice', 'Invoice')} #${p[2]}`;
      if (p[3] === 'discount') return `${t('settings.logs.entities.discount', 'Discount')} - ${t('settings.logs.entities.invoice', 'Invoice')} #${p[2]}`;
      if (p[3] === 'settle') return `${t('settings.logs.entities.settle', 'Settlement')} - ${t('settings.logs.entities.invoice', 'Invoice')} #${p[2]}`;
    }
    if (entity.startsWith('sales/payments')) return t('settings.logs.entities.payments', 'Payments');
    if (entity.startsWith('eway-bills')) {
      const p = entity.split('/');
      if (p.length === 1) return t('settings.logs.entities.ewayBills', 'E-Way Bills');
      if (p[2] === 'cancel') return `${t('settings.logs.entities.cancel', 'Cancelled')} - ${t('settings.logs.entities.ewayBill', 'E-Way Bill')} #${p[1]}`;
    }
    if (entity.startsWith('masters/customers')) return t('settings.logs.entities.customers', 'Customers');
    if (entity.startsWith('hr/employees')) return t('settings.logs.entities.employees', 'Employees');
    
    return entity.replace(/\//g, ' > ');
  };

  const columns = [
    { key: 'timestamp', label: t('settings.logs.cols.timestamp', 'Timestamp'), render: (r: any) => new Date(r.timestamp).toLocaleString('en-IN') },
    { key: 'user', label: t('settings.logs.cols.user', 'User'), render: (r: any) => r.user?.name || t('settings.logs.system', 'System') },
    { key: 'action', label: t('settings.logs.cols.action', 'Action'), render: (r: any) => (
      <Badge variant={r.action === 'DELETED' ? 'destructive' : r.action === 'CREATED' ? 'default' : 'secondary'}>{String(t(`settings.logs.action.${r.action}`, r.action))}</Badge>
    )},
    { key: 'entity', label: t('settings.logs.cols.entity', 'Module / Entity'), render: (r: any) => <span className="text-slate-600 font-medium">{formatEntity(r.entity)}</span> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.logs.title', 'System Activity Logs')}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={logs} isLoading={isLoading} searchKey="entity" />
      </CardContent>
    </Card>
  );
}

function DatabaseBackupSection() {
  const { t } = useTranslation();
  const handleDownload = () => {
    // Open in new window to trigger download
    window.open(`${api.defaults.baseURL}/system/backup`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.backup.title', 'Database Backup')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">
          {t('settings.backup.desc', 'Download a complete JSON export of all core business data (Customers, Orders, Invoices, Work Orders, Inventory, etc.). Keep this file secure as it contains sensitive business information.')}
        </p>
        <Button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700">
          {t('settings.backup.download', 'Download Full Backup (JSON)')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shadow-lg shadow-slate-200/50">
          <SettingsIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('settings.title', 'Settings')}</h1>
          <p className="text-sm text-slate-500">Configure company profiles, user accounts, and system backups</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {masterTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-t-xl font-semibold text-sm transition-all duration-150 flex items-center gap-2 border border-transparent ${
                activeTab === tab.key 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50' 
                  : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(tab.label, tab.fallback)}
            </button>
          );
        })}
      </div>

      {activeTab === 'company' && <CompanySettings />}
      {activeTab === 'users' && <UsersSection />}
      {activeTab === 'logs' && <ActivityLogsSection />}
      {activeTab === 'backups' && <DatabaseBackupSection />}
    </div>
  );
}
