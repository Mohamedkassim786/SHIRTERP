import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {  Truck, IndianRupee, Trash2, Eye, MoreHorizontal, PenSquare  } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    { 
      key: 'phone', 
      label: t('customers.cols.phone', 'Phone'),
      render: (r: any) => <span className="whitespace-nowrap text-slate-600">{r.phone || '-'}</span>
    },
    { 
      key: 'outstandingBalance', 
      label: t('suppliers.cols.weOwe', 'WE OWE (₹)'), 
      render: (row: any) => (
        <span className={`font-bold whitespace-nowrap ${row.outstandingBalance > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
          ₹{(row.outstandingBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'actions', 
      label: t('customers.cols.actions', 'Actions'), 
      render: (row: any) => (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-white border border-slate-200 shadow-lg rounded-xl p-1 z-[9999]">
              <DropdownMenuItem 
                onClick={() => navigate(`/suppliers/${row.id}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
              >
                <Eye className="h-4 w-4 text-slate-400" />
                {t('common.profile', 'Profile')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleOpenDialog(row)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
              >
                <PenSquare className="h-4 w-4 text-slate-400" />
                {t('common.edit', 'Edit')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this vendor? Historical purchases will be preserved.')) {
                    deleteMutation.mutate(row.id);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer transition-colors font-medium"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
                {t('common.delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('suppliers.title', 'Vendor Management')}</h1>
          <p className="text-sm text-slate-500">Manage vendor relations, purchase histories, and payments</p>
        </div>
      </div>

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
