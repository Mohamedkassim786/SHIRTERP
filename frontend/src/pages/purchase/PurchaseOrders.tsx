import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import api from '@/api/axios';

interface POItem {
  materialId: string;
  quantity: string;
  unitPrice: string;
}

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGRNDialogOpen, setIsGRNDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [formData, setFormData] = useState({ supplierId: '', notes: '' });
  const [items, setItems] = useState<POItem[]>([{ materialId: '', quantity: '', unitPrice: '' }]);

  const { data: pos = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await api.get('/purchase/purchase-orders')).data,
    retry: 1
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/masters/suppliers')).data,
    retry: 1
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['raw-materials'],
    queryFn: async () => (await api.get('/masters/raw-materials')).data,
    retry: 1
  });

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => api.post('/purchase/purchase-orders', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); setIsDialogOpen(false); resetForm(); },
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating PO')
  });

  const grnMutation = useMutation({
    mutationFn: async (poId: number) => api.post('/purchase/grn', { poId, notes: 'Goods received in full' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsGRNDialogOpen(false);
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error processing GRN')
  });

  const resetForm = () => {
    setFormData({ supplierId: '', notes: '' });
    setItems([{ materialId: '', quantity: '', unitPrice: '' }]);
  };

  const addItem = () => setItems([...items, { materialId: '', quantity: '', unitPrice: '' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof POItem, value: string) => {
    const n = [...items]; n[idx][field] = value; setItems(n);
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.materialId || !i.quantity || !i.unitPrice)) {
      alert('Please fill all item fields'); return;
    }
    createPOMutation.mutate({
      ...formData,
      supplierId: Number(formData.supplierId),
      items: items.map(i => ({ materialId: Number(i.materialId), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }))
    });
  };

  const getTotalAmount = (po: any) => {
    return (po.items || []).reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0).toLocaleString('en-IN');
  };

  const columns = [
    { key: 'poNumber', label: 'PO Number' },
    { key: 'supplier', label: 'Supplier', render: (row: any) => row.supplier?.name || '-' },
    { key: 'items', label: 'Items', render: (row: any) => `${row.items?.length || 0} materials` },
    { key: 'totalAmount', label: 'Total (₹)', render: (row: any) => `₹${getTotalAmount(row)}` },
    { key: 'status', label: 'Status', render: (row: any) => (
      <Badge variant={row.status === 'COMPLETED' ? 'default' : 'secondary'}>{row.status}</Badge>
    )},
    { key: 'actions', label: 'Action', render: (row: any) => (
      row.status === 'PENDING' ? (
        <Button size="sm" onClick={() => { setSelectedPO(row); setIsGRNDialogOpen(true); }}>
          Receive Goods (GRN)
        </Button>
      ) : <span className="text-xs text-green-600 font-medium">✓ Received</span>
    )}
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
      <DataTable columns={columns} data={pos} searchKey="poNumber" onAdd={() => { resetForm(); setIsDialogOpen(true); }} />

      {/* Create PO Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <form onSubmit={handleCreatePO} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} required>
                  <option value="">Select Supplier</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes..." />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Materials to Order *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Row</Button>
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-2 text-left">Material</th>
                      <th className="p-2 text-left">Quantity</th>
                      <th className="p-2 text-left">Unit Price (₹)</th>
                      <th className="p-2 text-left">Total</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <select className="w-full rounded border border-input px-2 py-1 text-sm" value={item.materialId} onChange={e => updateItem(idx, 'materialId', e.target.value)} required>
                            <option value="">Select</option>
                            {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2"><Input type="number" min="0.01" step="0.01" className="w-24" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required /></td>
                        <td className="p-2"><Input type="number" min="0.01" step="0.01" className="w-28" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} required /></td>
                        <td className="p-2 font-medium">
                          ₹{((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2">
                          {items.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50 border-t">
                    <tr>
                      <td className="p-2 font-bold" colSpan={3}>Total Amount:</td>
                      <td className="p-2 font-bold text-primary">
                        ₹{items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0).toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPOMutation.isPending}>
                {createPOMutation.isPending ? 'Creating...' : 'Create PO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={isGRNDialogOpen} onOpenChange={setIsGRNDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process GRN for {selectedPO?.poNumber}</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 mb-4">This will mark all goods as received and automatically <strong>increase raw material stock</strong> in the inventory.</p>
            {selectedPO?.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between py-2 border-b last:border-0 text-sm">
                <span>{item.material?.name}</span>
                <span className="font-medium">+{item.quantity} units</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsGRNDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => grnMutation.mutate(selectedPO.id)} disabled={grnMutation.isPending}>
              {grnMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
