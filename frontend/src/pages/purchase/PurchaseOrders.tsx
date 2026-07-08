import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {  Trash2, Plus  } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

interface POItem {
  materialId: string;
  quantity: string;
  unitPrice: string;
}

export default function PurchaseOrders() {
  const { t } = useTranslation();
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
    { key: 'poNumber', label: t('purchases.cols.poNumber', 'PO NUMBER') },
    { key: 'supplier', label: t('purchases.cols.supplier', 'SUPPLIER'), render: (row: any) => row.supplier?.name || '-' },
    { key: 'items', label: t('purchases.cols.items', 'ITEMS'), render: (row: any) => `${row.items?.length || 0} ${t('purchases.materials', 'materials')}` },
    { key: 'totalAmount', label: t('purchases.cols.total', 'TOTAL (₹)'), render: (row: any) => `₹${getTotalAmount(row)}` },
    { key: 'status', label: t('customers.cols.status', 'Status'), render: (row: any) => (
      <Badge variant={row.status === 'COMPLETED' ? 'default' : 'secondary'}>{row.status}</Badge>
    )},
    { key: 'actions', label: t('customers.cols.actions', 'ACTION'), render: (row: any) => (
      row.status === 'PENDING' ? (
        <Button size="sm" onClick={() => { setSelectedPO(row); setIsGRNDialogOpen(true); }}>
          {t('purchases.receiveGoods', 'Receive Goods (GRN)')}
        </Button>
      ) : <span className="text-xs text-green-600 font-medium">✓ {t('purchases.received', 'Received')}</span>
    )}
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t('purchases.title', 'Purchase Orders')}</h1>
      <DataTable columns={columns} data={pos} searchKey="poNumber" onAdd={() => { resetForm(); setIsDialogOpen(true); }} addLabel={t('common.addNew', 'Add New')} />

      {/* Create PO Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('purchases.form.title', 'Create Purchase Order')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreatePO} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('purchases.form.supplier', 'Supplier *')}</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} required>
                  <option value="">{t('purchases.form.selectSupplier', 'Select Supplier')}</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </AnimatedSelect>
              </div>
              <div className="space-y-2">
                <Label>{t('purchases.form.notes', 'Notes')}</Label>
                <AnimatedInput value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes..." />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">{t('purchases.form.materialsToOrder', 'Materials to Order *')}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />{t('orders.form.addRow', 'Add Row')}</Button>
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-2 text-left">{t('purchases.form.material', 'Material')}</th>
                      <th className="p-2 text-left">{t('purchases.form.quantity', 'Quantity')}</th>
                      <th className="p-2 text-left">{t('purchases.form.unitPrice', 'Unit Price (₹)')}</th>
                      <th className="p-2 text-left">{t('common.total', 'Total')}</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-sm" value={item.materialId} onChange={e => updateItem(idx, 'materialId', e.target.value)} required>
                            <option value="">{t('common.select', 'Select')}</option>
                            {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-2"><AnimatedInput type="number" min="0.01" step="0.01" className="w-24" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required /></td>
                        <td className="p-2"><AnimatedInput type="number" min="0.01" step="0.01" className="w-28" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} required /></td>
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
                      <td className="p-2 font-bold" colSpan={3}>{t('purchases.form.totalAmount', 'Total Amount:')}</td>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={createPOMutation.isPending}>
                {createPOMutation.isPending ? t('purchases.form.creating', 'Creating...') : t('purchases.form.create', 'Create PO')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={isGRNDialogOpen} onOpenChange={setIsGRNDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('purchases.grn.title', 'Process GRN for')} {selectedPO?.poNumber}</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 mb-4">{t('purchases.grn.desc', 'This will mark all goods as received and automatically increase raw material stock in the inventory.')}</p>
            {selectedPO?.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between py-2 border-b last:border-0 text-sm">
                <span>{item.material?.name}</span>
                <span className="font-medium">+{item.quantity} units</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsGRNDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={() => grnMutation.mutate(selectedPO.id)} disabled={grnMutation.isPending}>
              {grnMutation.isPending ? t('purchases.grn.processing', 'Processing...') : t('purchases.grn.confirm', 'Confirm Receipt')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
