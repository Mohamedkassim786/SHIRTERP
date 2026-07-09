import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Package, AlertTriangle, ArrowDownUp, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

export default function RawMaterials() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);

  const [materialForm, setMaterialForm] = useState({ name: '', unitId: '', minStockLevel: '', location: '' });
  const [stockForm, setStockForm] = useState({ materialId: '', type: 'IN', quantity: '', reference: '', batchNumber: '', notes: '' });

  const { data: materials = [], isLoading, error } = useQuery({
    queryKey: ['raw-materials'],
    queryFn: async () => (await api.get('/masters/raw-materials')).data,
    retry: 1
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: async () => (await api.get('/masters/inventory/dashboard')).data,
    retry: 1
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await api.get('/masters/units')).data,
    retry: 1
  });

  const materialMutation = useMutation({
    mutationFn: async (data: any) => api.post('/masters/raw-materials', { ...data, unitId: Number(data.unitId), minStockLevel: Number(data.minStockLevel) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      setIsMaterialDialogOpen(false);
    }
  });

  const stockMutation = useMutation({
    mutationFn: async (data: any) => api.post('/masters/inventory/stock/adjustment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      setIsStockDialogOpen(false);
      setStockForm({ materialId: '', type: 'IN', quantity: '', reference: '', batchNumber: '', notes: '' });
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error adjusting stock')
  });

  const columns = [
    { key: 'name', label: t('inventory.cols.name', 'MATERIAL NAME'), render: (row: any) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: 'location', label: t('inventory.cols.location', 'LOCATION'), render: (row: any) => row.location || '-' },
    {
      key: 'currentStock', label: t('inventory.cols.currentStock', 'CURRENT STOCK'), render: (row: any) => (
        <span className={`px-2 py-1 rounded-md text-sm font-bold ${row.currentStock <= row.minStockLevel ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {row.currentStock} {row.unit?.shortName}
        </span>
      )
    },
    { key: 'minStockLevel', label: t('inventory.cols.minAlert', 'MIN ALERT LEVEL'), render: (row: any) => `${row.minStockLevel} ${row.unit?.shortName}` },
    {
      key: 'actions', label: t('customers.cols.actions', 'Actions'), render: (row: any) => (
        <Button size="sm" variant="outline" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => navigate(`/inventory/${row.id}`)}>
          <Eye className="h-4 w-4 mr-1" /> {t('inventory.cols.ledger', 'Ledger')}
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-200/50">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('inventory.title', 'Inventory Management')}</h1>
            <p className="text-sm text-slate-500">Track raw material stocks, warehouse locations, and adjustments</p>
          </div>
        </div>
        <Button onClick={() => setIsStockDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
          <ArrowDownUp className="h-4 w-4 mr-2" /> {t('inventory.adjustStock', 'Adjust Stock')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{t('inventory.kpi.total', 'Total Materials Tracked')}</p>
              <p className="text-2xl font-bold">{dashboardStats?.totalItems || 0}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl"><Package className="h-6 w-6 text-indigo-600" /></div>
          </CardContent>
        </Card>
        <Card className={`glass border-l-4 ${dashboardStats?.lowStockCount > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{t('inventory.kpi.lowStock', 'Low Stock Alerts')}</p>
              <p className={`text-2xl font-bold ${dashboardStats?.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{dashboardStats?.lowStockCount || 0}</p>
            </div>
            <div className={`p-3 rounded-xl ${dashboardStats?.lowStockCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertTriangle className={`h-6 w-6 ${dashboardStats?.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-end pt-4">
        <h2 className="text-lg font-bold text-slate-700">{t('inventory.directory', 'Materials Directory')}</h2>
      </div>

      <DataTable
        columns={columns}
        data={materials}
        isLoading={isLoading}
        error={error}
        searchKey="name"
        onAdd={() => setIsMaterialDialogOpen(true)}
        addLabel={t('common.addNew', 'Add New')}
      />

      {/* Add Material Dialog */}
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('inventory.addNew', 'Add New Raw Material')}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); materialMutation.mutate(materialForm); }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('inventory.form.name', 'Material Name *')}</Label>
              <AnimatedInput required value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('inventory.form.unit', 'Unit *')}</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={materialForm.unitId} onChange={e => setMaterialForm({ ...materialForm, unitId: e.target.value })} required>
                  <option value="">{t('inventory.form.selectUnit', 'Select Unit')}</option>
                  {units.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.shortName})</option>)}
                </AnimatedSelect>
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.form.minStock', 'Min Stock Alert Level *')}</Label>
                <AnimatedInput type="number" required value={materialForm.minStockLevel} onChange={e => setMaterialForm({ ...materialForm, minStockLevel: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.form.location', 'Location / Warehouse Shelf (Optional)')}</Label>
              <AnimatedInput placeholder={t('inventory.form.locPlaceholder', 'e.g. Rack A3')} value={materialForm.location} onChange={e => setMaterialForm({ ...materialForm, location: e.target.value })} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={materialMutation.isPending}>{t('common.save', 'Save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Stock Adjustment</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); stockMutation.mutate(stockForm); }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Material *</Label>
              <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={stockForm.materialId} onChange={e => setStockForm({ ...stockForm, materialId: e.target.value })} required>
                <option value="">Select Material</option>
                {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name} (Current: {m.currentStock} {m.unit?.shortName})</option>)}
              </AnimatedSelect>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transaction Type *</Label>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant={stockForm.type === 'IN' ? 'default' : 'outline'} className={`w-full ${stockForm.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : ''}`} onClick={() => setStockForm({ ...stockForm, type: 'IN' })}>Stock IN (+)</Button>
                  <Button type="button" variant={stockForm.type === 'OUT' ? 'default' : 'outline'} className={`w-full ${stockForm.type === 'OUT' ? 'bg-red-600 hover:bg-red-700' : ''}`} onClick={() => setStockForm({ ...stockForm, type: 'OUT' })}>Stock OUT (-)</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <AnimatedInput type="number" min="0.01" step="0.01" required value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Batch Number / Roll ID (Optional)</Label>
              <AnimatedInput placeholder="Scan barcode or type manually" value={stockForm.batchNumber} onChange={e => setStockForm({ ...stockForm, batchNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reason / Notes</Label>
              <AnimatedInput placeholder="e.g. Initial Stock Load, Damaged, Usage" value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={stockMutation.isPending}>Confirm Adjustment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
