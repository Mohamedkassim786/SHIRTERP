import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, FileCheck } from 'lucide-react';
import api from '@/api/axios';

interface QItem { modelId: string; colorId: string; sizeId: string; quantity: string; unitPrice: string; gstPercent: string; }

const statusColors: Record<string, any> = { DRAFT: 'secondary', SENT: 'default', ACCEPTED: 'outline', REJECTED: 'destructive' };

export default function Quotations() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedQ, setSelectedQ] = useState<any>(null);
  const [convertDate, setConvertDate] = useState('');
  const [form, setForm] = useState({ customerId: '', validUntil: '', notes: '' });
  const [items, setItems] = useState<QItem[]>([{ modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]);

  const { data: quotations = [] } = useQuery({ queryKey: ['quotations'], queryFn: async () => (await api.get('/quotations')).data, retry: 1 });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: async () => (await api.get('/masters/customers')).data, retry: 1 });
  const { data: models = [] } = useQuery({ queryKey: ['shirt-models'], queryFn: async () => (await api.get('/masters/shirt-models')).data, retry: 1 });
  const { data: colors = [] } = useQuery({ queryKey: ['colors'], queryFn: async () => (await api.get('/masters/colors')).data, retry: 1 });
  const { data: sizes = [] } = useQuery({ queryKey: ['sizes'], queryFn: async () => (await api.get('/masters/sizes')).data, retry: 1 });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/quotations', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); setIsOpen(false); resetForm(); }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/quotations/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] })
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, deliveryDate }: { id: number; deliveryDate: string }) => api.post(`/quotations/${id}/convert`, { deliveryDate }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); queryClient.invalidateQueries({ queryKey: ['customer-orders'] }); setIsConvertOpen(false); alert('Quotation converted to Order successfully!'); }
  });

  const resetForm = () => { setForm({ customerId: '', validUntil: '', notes: '' }); setItems([{ modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]); };
  const addItem = () => setItems([...items, { modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, f: keyof QItem, v: string) => { const n = [...items]; n[i][f] = v; setItems(n); };
  const getTotal = () => items.reduce((s, i) => { const sub = (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0); return s + sub + sub * (Number(i.gstPercent) || 0) / 100; }, 0);

  const columns = [
    { key: 'quotationNumber', label: 'Quotation #' },
    { key: 'customer', label: 'Customer', render: (r: any) => r.customer?.name },
    { key: 'items', label: 'Items', render: (r: any) => `${r.items?.length || 0} lines` },
    { key: 'totalAmount', label: 'Total', render: (r: any) => <span className="font-bold">₹{r.totalAmount?.toLocaleString('en-IN')}</span> },
    { key: 'validUntil', label: 'Valid Until', render: (r: any) => r.validUntil ? new Date(r.validUntil).toLocaleDateString('en-IN') : '-' },
    { key: 'status', label: 'Status', render: (r: any) => <Badge variant={statusColors[r.status]}>{r.status}</Badge> },
    { key: 'actions', label: 'Actions', render: (r: any) => (
      <div className="flex gap-1 flex-wrap">
        {r.status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: r.id, status: 'SENT' })}>Mark Sent</Button>}
        {r.status === 'SENT' && <>
          <Button size="sm" onClick={() => { setSelectedQ(r); setIsConvertOpen(true); }}><FileCheck className="h-3 w-3 mr-1" />Convert to Order</Button>
          <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: r.id, status: 'REJECTED' })}>Reject</Button>
        </>}
        {r.status === 'ACCEPTED' && <span className="text-xs text-green-600 font-medium">✓ Converted</span>}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
      <DataTable columns={columns} data={quotations} searchKey="quotationNumber" onAdd={() => { resetForm(); setIsOpen(true); }} />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Quotation</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, items }); }} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required>
                  <option value="">Select Customer</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, delivery notes..." />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Items *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Row</Button>
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50"><tr><th className="p-2 text-left">Shirt</th><th className="p-2 text-left">Color</th><th className="p-2 text-left">Size</th><th className="p-2">Qty</th><th className="p-2">Price</th><th className="p-2">GST%</th><th className="p-2">Total</th><th></th></tr></thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1"><select className="w-full rounded border border-input px-2 py-1 text-xs" value={it.modelId} onChange={e => updateItem(idx, 'modelId', e.target.value)} required><option value="">Select</option>{models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
                        <td className="p-1"><select className="w-full rounded border border-input px-2 py-1 text-xs" value={it.colorId} onChange={e => updateItem(idx, 'colorId', e.target.value)} required><option value="">Select</option>{colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                        <td className="p-1"><select className="w-full rounded border border-input px-2 py-1 text-xs" value={it.sizeId} onChange={e => updateItem(idx, 'sizeId', e.target.value)} required><option value="">Select</option>{sizes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
                        <td className="p-1"><Input type="number" min="1" className="w-16 text-xs" value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required /></td>
                        <td className="p-1"><Input type="number" min="0" className="w-24 text-xs" value={it.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} required /></td>
                        <td className="p-1"><select className="w-16 rounded border border-input px-1 py-1 text-xs" value={it.gstPercent} onChange={e => updateItem(idx, 'gstPercent', e.target.value)}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option></select></td>
                        <td className="p-1 text-xs font-medium">₹{((Number(it.quantity)||0)*(Number(it.unitPrice)||0)*(1+(Number(it.gstPercent)||0)/100)).toFixed(0)}</td>
                        <td className="p-1">{items.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-red-500" /></Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50 border-t font-bold text-sm"><tr><td colSpan={6} className="p-2 text-right">Grand Total (incl. GST):</td><td className="p-2 text-primary">₹{getTotal().toFixed(2)}</td><td></td></tr></tfoot>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Quotation'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convert {selectedQ?.quotationNumber} to Order</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-400">This will create a Customer Order with all {selectedQ?.items?.length} items from this quotation.</p>
            <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={convertDate} onChange={e => setConvertDate(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConvertOpen(false)}>Cancel</Button>
              <Button onClick={() => convertMutation.mutate({ id: selectedQ?.id, deliveryDate: convertDate })} disabled={convertMutation.isPending}>{convertMutation.isPending ? 'Converting...' : 'Confirm Convert'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
