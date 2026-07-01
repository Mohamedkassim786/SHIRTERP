import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save } from 'lucide-react';
import api from '@/api/axios';

type SettingsTab = 'company' | 'users' | 'logs' | 'backups';

const masterTabs: { key: string; label: string }[] = [
  { key: 'company', label: '🏢 Company Profile' },
  { key: 'users',   label: '👤 User Management' },
  { key: 'logs',    label: '📋 Activity Logs' },
  { key: 'backups', label: '💾 Database Backup' },
];

const masterConfig: Record<string, any> = {
  sizes: { endpoint: '/masters/sizes', fields: [{ key: 'name', label: 'Size Name' }] },
  colors: { endpoint: '/masters/colors', fields: [{ key: 'name', label: 'Color Name' }, { key: 'hexCode', label: 'Hex Code', type: 'color' }] },
  units: { endpoint: '/masters/units', fields: [{ key: 'name', label: 'Unit Name' }, { key: 'shortName', label: 'Short Name' }] },
  categories: { endpoint: '/masters/categories', fields: [{ key: 'name', label: 'Category Name' }] },
  departments: { endpoint: '/masters/departments', fields: [{ key: 'name', label: 'Department Name' }] },
};

function MasterSection({ tabKey }: { tabKey: string }) {
  const config = masterConfig[tabKey];
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: items = [] } = useQuery({ queryKey: [tabKey], queryFn: async () => (await api.get(config.endpoint)).data, retry: 1 });
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(config.endpoint, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [tabKey] }); setIsOpen(false); setFormData({}); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${config.endpoint}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [tabKey] }),
    onError: () => alert('Cannot delete — this item is used by existing records')
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="capitalize">{tabKey}</CardTitle>
        <Button size="sm" onClick={() => { setFormData({}); setIsOpen(true); }}>+ Add</Button>
      </CardHeader>
      <CardContent>
        <DataTable columns={[
          ...config.fields.map((f: any) => f.type === 'color' ? { key: f.key, label: 'Color', render: (r: any) => <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full border" style={{ backgroundColor: r.hexCode }} /><span>{r.hexCode}</span></div> } : { key: f.key, label: f.label }),
          { key: 'actions', label: '', render: (r: any) => <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${r.name}"?`)) deleteMutation.mutate(r.id); }} className="text-red-500">Delete</Button> }
        ]} data={items} searchKey="name" />
      </CardContent>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add {tabKey.slice(0, -1)}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4 pt-4">
            {config.fields.map((f: any) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                {f.type === 'color' ? (
                  <div className="flex gap-3 items-center">
                    <input type="color" value={formData[f.key] || '#000000'} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className="h-10 w-16 rounded border cursor-pointer" />
                    <Input value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} placeholder="#000000" />
                  </div>
                ) : <Input required value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} />}
              </div>
            ))}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button><Button type="submit">Save</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CompanySettings() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['company-settings'], queryFn: async () => (await api.get('/admin/settings')).data, retry: 1 });
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put('/admin/settings', data),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['company-settings'] }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  });

  const current = { ...(settings || {}), ...form };

  const fields = [
    { key: 'companyName', label: 'Company Name', required: true },
    { key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email', type: 'email' }, { key: 'gstin', label: 'GSTIN' },
    { key: 'cin', label: 'CIN' }, { key: 'invoicePrefix', label: 'Invoice Prefix (e.g. INV)' },
    { key: 'invoiceFooter', label: 'Invoice Footer Text' }, { key: 'termsConditions', label: 'Terms & Conditions' },
    { key: 'bankDetails', label: 'Bank Details for Invoice' },
    { key: 'razorpayKeyId', label: 'Razorpay Key ID (for Payment Link)' },
    { key: 'razorpaySecret', label: 'Razorpay Secret', type: 'password' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Company Profile</CardTitle>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Saved!</span>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.key} className={`space-y-2 ${['address', 'invoiceFooter', 'termsConditions', 'bankDetails'].includes(f.key) ? 'sm:col-span-2' : ''}`}>
              <Label>{f.label}</Label>
              <Input type={f.type || 'text'} required={f.required} value={current[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => mutation.mutate(current)} disabled={mutation.isPending}><Save className="h-4 w-4 mr-2" />{mutation.isPending ? 'Saving...' : 'Save Settings'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersSection() {
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
        <CardTitle>User Management</CardTitle>
        <Button size="sm" onClick={() => setIsOpen(true)}>+ Add User</Button>
      </CardHeader>
      <CardContent>
        <DataTable columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (r: any) => <Badge>{r.role?.name}</Badge> },
          { key: 'isActive', label: 'Status', render: (r: any) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
          { key: 'actions', label: '', render: (r: any) => <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate(r)}>{r.isActive ? 'Deactivate' : 'Activate'}</Button> },
        ]} data={users} searchKey="name" />
      </CardContent>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, roleId: Number(form.roleId) }); }} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password *</Label><Input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div className="space-y-2"><Label>Role *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} required>
                  <option value="">Select Role</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button><Button type="submit">Create User</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ActivityLogsSection() {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['activity-logs'], queryFn: async () => (await api.get('/system/logs')).data, retry: 1 });

  const columns = [
    { key: 'timestamp', label: 'Timestamp', render: (r: any) => new Date(r.timestamp).toLocaleString('en-IN') },
    { key: 'user', label: 'User', render: (r: any) => r.user?.name || 'System' },
    { key: 'action', label: 'Action', render: (r: any) => (
      <Badge variant={r.action === 'DELETED' ? 'destructive' : r.action === 'CREATED' ? 'default' : 'secondary'}>{r.action}</Badge>
    )},
    { key: 'entity', label: 'Module / Entity' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={logs} isLoading={isLoading} searchKey="entity" />
      </CardContent>
    </Card>
  );
}

function DatabaseBackupSection() {
  const handleDownload = () => {
    // Open in new window to trigger download
    window.open(`${api.defaults.baseURL}/system/backup`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Backup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">
          Download a complete JSON export of all core business data (Customers, Orders, Invoices, Work Orders, Inventory, etc.). Keep this file secure as it contains sensitive business information.
        </p>
        <Button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700">
          Download Full Backup (JSON)
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {masterTabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as SettingsTab)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-200'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && <CompanySettings />}
      {activeTab === 'users' && <UsersSection />}
      {activeTab === 'logs' && <ActivityLogsSection />}
      {activeTab === 'backups' && <DatabaseBackupSection />}
    </div>
  );
}
