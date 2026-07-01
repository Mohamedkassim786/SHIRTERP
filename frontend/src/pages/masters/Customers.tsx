import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, IndianRupee, Clock, Trash2, Eye } from 'lucide-react';
import api from '@/api/axios';

export default function Customers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', type: 'RETAIL', phone: '', address: '', gstNumber: '' });

  // Fetch Customers
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/masters/customers')).data,
    retry: 1
  });

  // Fetch CRM Dashboard Stats
  const { data: crmStats } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: async () => (await api.get('/masters/crm/dashboard')).data,
    retry: 1
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCustomer) return api.put(`/masters/customers/${editingCustomer.id}`, data);
      return api.post('/masters/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
      setIsDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/masters/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    }
  });

  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ 
        name: customer.name || '', 
        type: customer.type || 'RETAIL',
        phone: customer.phone || '', 
        address: customer.address || '', 
        gstNumber: customer.gstNumber || '' 
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', type: 'RETAIL', phone: '', address: '', gstNumber: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const columns = [
    { key: 'name', label: 'Customer Name', render: (r: any) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'type', label: 'Type', render: (r: any) => (
      <Badge variant={r.type === 'WHOLESALE' ? 'default' : r.type === 'DISTRIBUTOR' ? 'destructive' : 'secondary'}>
        {r.type}
      </Badge>
    )},
    { key: 'phone', label: 'Phone' },
    { key: 'outstandingBalance', label: 'Outstanding (₹)', render: (row: any) => (
      <span className={`font-bold ${row.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
        ₹{row.outstandingBalance?.toLocaleString('en-IN') || 0}
      </span>
    )},
    { key: 'actions', label: 'Actions', render: (row: any) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => navigate(`/customers/${row.id}`)}>
          <Eye className="h-4 w-4 mr-1" /> Profile
        </Button>
        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => {
          if(confirm('Are you sure you want to delete this customer? Historical data will be preserved.')) deleteMutation.mutate(row.id);
        }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">CRM Dashboard</h1>

      {/* CRM KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Customers</p>
              <p className="text-2xl font-bold">{crmStats?.totalCustomers || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl"><Users className="h-6 w-6 text-blue-600" /></div>
          </CardContent>
        </Card>
        <Card className="glass border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Market Dues</p>
              <p className="text-2xl font-bold text-red-600">₹{crmStats?.totalOutstanding?.toLocaleString('en-IN') || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl"><IndianRupee className="h-6 w-6 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card className="glass border-l-4 border-l-orange-500 cursor-pointer hover:bg-slate-50/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Pending Follow-ups</p>
              <p className="text-2xl font-bold text-orange-600">{crmStats?.pendingReminders?.length || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl"><Clock className="h-6 w-6 text-orange-600" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-end">
        <h2 className="text-lg font-bold text-slate-700">Customer Directory</h2>
      </div>

      <DataTable 
        columns={columns} 
        data={customers} 
        isLoading={isLoading}
        error={error}
        searchKey="name" 
        onAdd={() => handleOpenDialog()} 
        onEdit={(row) => handleOpenDialog(row)} 
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Name *</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Customer Type</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>GST Number</Label>
                <Input value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Customer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
