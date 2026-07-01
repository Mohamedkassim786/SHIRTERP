import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Package, AlertTriangle, ArrowDownUp, Eye } from 'lucide-react';
import api from '@/api/axios';

export default function RawMaterials() {
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
    { key: 'name', label: 'Material Name', render: (row: any) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: 'location', label: 'Location', render: (row: any) => row.location || '-' },
    { key: 'currentStock', label: 'Current Stock', render: (row: any) => (
      <span className={`px-2 py-1 rounded-md text-sm font-bold ${row.currentStock <= row.minStockLevel ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {row.currentStock} {row.unit?.shortName}
      </span>
    )},
    { key: 'minStockLevel', label: 'Min Alert Level', render: (row: any) => `${row.minStockLevel} ${row.unit?.shortName}` },
    { key: 'actions', label: 'Actions', render: (row: any) => (
      <Button size="sm" variant="outline" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => navigate(`/inventory/${row.id}`)}>
        <Eye className="h-4 w-4 mr-1" /> Ledger
      </Button>
    )}
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
        <Button onClick={() => setIsStockDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <ArrowDownUp className="h-4 w-4 mr-2" /> Adjust Stock
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Materials Tracked</p>
              <p className="text-2xl font-bold">{dashboardStats?.totalItems || 0}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl"><Package className="h-6 w-6 text-indigo-600" /></div>
          </CardContent>
        </Card>
        <Card className={`glass border-l-4 ${dashboardStats?.lowStockCount > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Low Stock Alerts</p>
              <p className={`text-2xl font-bold ${dashboardStats?.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{dashboardStats?.lowStockCount || 0}</p>
            </div>
            <div className={`p-3 rounded-xl ${dashboardStats?.lowStockCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertTriangle className={`h-6 w-6 ${dashboardStats?.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-end pt-4">
        <h2 className="text-lg font-bold text-slate-700">Materials Directory</h2>
      </div>

      <DataTable 
        columns={columns} 
        data={materials} 
        isLoading={isLoading}
        error={error}
        searchKey="name" 
        onAdd={() => setIsMaterialDialogOpen(true)} 
      />

      {/* Add Material Dialog */}
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Raw Material</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); materialMutation.mutate(materialForm); }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Material Name *</Label>
              <Input required value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={materialForm.unitId} onChange={e => setMaterialForm({ ...materialForm, unitId: e.target.value })} required>
                  <option value="">Select Unit</option>
                  {units.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.shortName})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Min Stock Alert Level *</Label>
                <Input type="number" required value={materialForm.minStockLevel} onChange={e => setMaterialForm({ ...materialForm, minStockLevel: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location / Warehouse Shelf (Optional)</Label>
              <Input placeholder="e.g. Rack A3" value={materialForm.location} onChange={e => setMaterialForm({ ...materialForm, location: e.target.value })} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={materialMutation.isPending}>Save</Button>
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
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={stockForm.materialId} onChange={e => setStockForm({ ...stockForm, materialId: e.target.value })} required>
                <option value="">Select Material</option>
                {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name} (Current: {m.currentStock} {m.unit?.shortName})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transaction Type *</Label>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant={stockForm.type === 'IN' ? 'default' : 'outline'} className={`w-full ${stockForm.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : ''}`} onClick={() => setStockForm({...stockForm, type: 'IN'})}>Stock IN (+)</Button>
                  <Button type="button" variant={stockForm.type === 'OUT' ? 'default' : 'outline'} className={`w-full ${stockForm.type === 'OUT' ? 'bg-red-600 hover:bg-red-700' : ''}`} onClick={() => setStockForm({...stockForm, type: 'OUT'})}>Stock OUT (-)</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" min="0.01" step="0.01" required value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Batch Number / Roll ID (Optional)</Label>
              <Input placeholder="Scan barcode or type manually" value={stockForm.batchNumber} onChange={e => setStockForm({ ...stockForm, batchNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reason / Notes</Label>
              <Input placeholder="e.g. Initial Stock Load, Damaged, Usage" value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={stockMutation.isPending}>Confirm Adjustment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
