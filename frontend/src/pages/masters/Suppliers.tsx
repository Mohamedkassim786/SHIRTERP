import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {  Truck, IndianRupee, Trash2, Eye  } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

export default function Suppliers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', category: 'GENERAL', phone: '', address: '', gstNumber: '' });

  // Fetch Suppliers
  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/masters/suppliers')).data,
    retry: 1
  });

  // Fetch Vendor Dashboard Stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['supplier-dashboard'],
    queryFn: async () => (await api.get('/masters/suppliers/dashboard')).data,
    retry: 1
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingSupplier) return api.put(`/masters/suppliers/${editingSupplier.id}`, data);
      return api.post('/masters/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-dashboard'] });
      setIsDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/masters/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-dashboard'] });
    }
  });

  const handleOpenDialog = (supplier?: any) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ 
        name: supplier.name || '', 
        category: supplier.category || 'GENERAL',
        phone: supplier.phone || '', 
        address: supplier.address || '', 
        gstNumber: supplier.gstNumber || '' 
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', category: 'GENERAL', phone: '', address: '', gstNumber: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const columns = [
    { key: 'name', label: t('suppliers.cols.name', 'VENDOR NAME'), render: (r: any) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'category', label: t('suppliers.cols.category', 'CATEGORY'), render: (r: any) => (
      <Badge variant="outline" className="text-slate-400 bg-slate-50/50">{r.category}</Badge>
    )},
    { key: 'phone', label: t('customers.cols.phone', 'Phone') },
    { key: 'outstandingBalance', label: t('suppliers.cols.weOwe', 'WE OWE (₹)'), render: (row: any) => (
      <span className={`font-bold ${row.outstandingBalance > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
        ₹{row.outstandingBalance?.toLocaleString('en-IN') || 0}
      </span>
    )},
    { key: 'actions', label: t('customers.cols.actions', 'Actions'), render: (row: any) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => navigate(`/suppliers/${row.id}`)}>
          <Eye className="h-4 w-4 mr-1" /> {t('common.profile', 'Profile')}
        </Button>
        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => {
          if(confirm('Are you sure you want to delete this vendor? Historical purchases will be preserved.')) deleteMutation.mutate(row.id);
        }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">{t('suppliers.title', 'Vendor Management')}</h1>

      {/* Vendor KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{t('suppliers.kpi.total', 'Total Vendors')}</p>
              <p className="text-2xl font-bold">{dashboardStats?.totalSuppliers || 0}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl"><Truck className="h-6 w-6 text-indigo-600" /></div>
          </CardContent>
        </Card>
        <Card className="glass border-l-4 border-l-orange-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{t('suppliers.kpi.outstanding', 'Total Outstanding (To Pay)')}</p>
              <p className="text-2xl font-bold text-orange-600">₹{dashboardStats?.totalOutstanding?.toLocaleString('en-IN') || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl"><IndianRupee className="h-6 w-6 text-orange-600" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-end">
        <h2 className="text-lg font-bold text-slate-700">{t('suppliers.directory', 'Vendor Directory')}</h2>
      </div>

      <DataTable 
        columns={columns} 
        data={suppliers} 
        isLoading={isLoading}
        error={error}
        searchKey="name" 
        onAdd={() => handleOpenDialog()} 
        addLabel={t('common.addNew', 'Add New')}
        onEdit={(row) => handleOpenDialog(row)} 
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? t('suppliers.edit', 'Edit Vendor') : t('suppliers.addNew', 'Add New Vendor')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>{t('suppliers.form.name', 'Vendor Name *')}</Label>
                <AnimatedInput required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>{t('suppliers.form.category', 'Category')}</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option value="GENERAL">{t('suppliers.form.general', 'General')}</option>
                  <option value="FABRIC">{t('suppliers.form.fabric', 'Fabric')}</option>
                  <option value="THREAD">{t('suppliers.form.thread', 'Thread')}</option>
                  <option value="PACKAGING">{t('suppliers.form.packaging', 'Packaging')}</option>
                  <option value="MACHINERY">{t('suppliers.form.machinery', 'Machinery')}</option>
                </AnimatedSelect>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>{t('common.phone', 'Phone')}</Label>
                <AnimatedInput value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>{t('customers.profile.gst', 'GST NUMBER')}</Label>
                <AnimatedInput value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t('common.address', 'Address')}</Label>
                <AnimatedInput value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? t('common.saving', 'Saving...') : t('suppliers.form.save', 'Save Vendor')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
