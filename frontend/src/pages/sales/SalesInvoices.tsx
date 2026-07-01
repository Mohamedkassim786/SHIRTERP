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

interface InvoiceItem {
  modelId: string; colorId: string; sizeId: string; quantity: string; unitPrice: string; gstPercent: string;
}

export default function SalesInvoices() {
  const queryClient = useQueryClient();
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ customerId: '', orderId: '' });
  const [items, setItems] = useState<InvoiceItem[]>([{ modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]);
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'CASH', reference: '' });

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['sales-invoices'],
    queryFn: async () => (await api.get('/sales/invoices')).data,
    retry: 1
  });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: async () => (await api.get('/masters/customers')).data, retry: 1 });
  const { data: models = [] } = useQuery({ queryKey: ['shirt-models'], queryFn: async () => (await api.get('/masters/shirt-models')).data, retry: 1 });
  const { data: colors = [] } = useQuery({ queryKey: ['colors'], queryFn: async () => (await api.get('/masters/colors')).data, retry: 1 });
  const { data: sizes = [] } = useQuery({ queryKey: ['sizes'], queryFn: async () => (await api.get('/masters/sizes')).data, retry: 1 });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => api.post('/sales/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finished-goods'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsInvoiceDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating invoice')
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => api.post('/sales/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsPaymentDialogOpen(false);
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error processing payment')
  });

  const resetForm = () => {
    setFormData({ customerId: '', orderId: '' });
    setItems([{ modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]);
  };

  const addItem = () => setItems([...items, { modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string) => {
    const n = [...items]; n[idx][field] = value; setItems(n);
  };

  const getLineTotal = (item: InvoiceItem) => {
    const sub = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sub + (sub * (Number(item.gstPercent) || 0) / 100);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.modelId || !i.colorId || !i.sizeId || !i.quantity || !i.unitPrice)) {
      alert('Please fill all item fields'); return;
    }
    createInvoiceMutation.mutate({
      customerId: Number(formData.customerId),
      orderId: formData.orderId ? Number(formData.orderId) : null,
      items: items.map(i => ({
        modelId: Number(i.modelId), colorId: Number(i.colorId), sizeId: Number(i.sizeId),
        quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), gstPercent: Number(i.gstPercent)
      }))
    });
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice No' },
    { key: 'customer', label: 'Customer', render: (row: any) => row.customer?.name || '-' },
    { key: 'items', label: 'Items', render: (row: any) => `${row.items?.length || 0} lines` },
    { key: 'totalAmount', label: 'Total (₹)', render: (row: any) => <span className="font-bold">₹{row.totalAmount?.toLocaleString('en-IN')}</span> },
    { key: 'status', label: 'Status', render: (row: any) => <Badge variant={row.status === 'PAID' ? 'default' : 'secondary'}>{row.status}</Badge> },
    { key: 'date', label: 'Date', render: (row: any) => new Date(row.date).toLocaleDateString('en-IN') },
    { key: 'actions', label: 'Action', render: (row: any) => (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => window.open(`/sales/invoice/${row.id}/print`, '_blank')}>
          Print
        </Button>
        {row.status !== 'PAID' ? (
          <Button size="sm" variant="outline" onClick={() => { setSelectedCustomerId(row.customerId); setIsPaymentDialogOpen(true); }}>
            Receive Payment
          </Button>
        ) : <span className="text-xs text-green-600">✓ Paid</span>}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Sales Invoices</h1>
      <DataTable 
        columns={columns} 
        data={invoices} 
        isLoading={isLoading} 
        error={error} 
        searchKey="invoiceNumber" 
        onAdd={() => { resetForm(); setIsInvoiceDialogOpen(true); }} 
      />

      {/* Create Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Generate Sales Invoice</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })} required>
                <option value="">Select Customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.outstandingBalance > 0 ? `(₹${c.outstandingBalance} outstanding)` : ''}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Invoice Items *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Row</Button>
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-2 text-left">Shirt</th>
                      <th className="p-2 text-left">Color</th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">Price (₹)</th>
                      <th className="p-2 text-left">GST%</th>
                      <th className="p-2 text-left">Total</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1"><select className="w-full rounded border border-input px-2 py-1 text-xs" value={item.modelId} onChange={e => updateItem(idx, 'modelId', e.target.value)} required><option value="">Select</option>{models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
                        <td className="p-1"><select className="w-full rounded border border-input px-2 py-1 text-xs" value={item.colorId} onChange={e => updateItem(idx, 'colorId', e.target.value)} required><option value="">Select</option>{colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                        <td className="p-1"><select className="w-full rounded border border-input px-2 py-1 text-xs" value={item.sizeId} onChange={e => updateItem(idx, 'sizeId', e.target.value)} required><option value="">Select</option>{sizes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
                        <td className="p-1"><Input type="number" min="1" className="w-16 text-xs" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required /></td>
                        <td className="p-1"><Input type="number" min="0" className="w-24 text-xs" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} required /></td>
                        <td className="p-1"><select className="w-16 rounded border border-input px-1 py-1 text-xs" value={item.gstPercent} onChange={e => updateItem(idx, 'gstPercent', e.target.value)}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option></select></td>
                        <td className="p-1 font-medium text-xs">₹{getLineTotal(item).toFixed(2)}</td>
                        <td className="p-1">{items.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-red-500" /></Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50 border-t font-bold text-sm">
                    <tr>
                      <td colSpan={6} className="p-2 text-right">Grand Total:</td>
                      <td className="p-2 text-primary">₹{items.reduce((s, i) => s + getLineTotal(i), 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receive Customer Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedCustomerId || ''} onChange={e => setSelectedCustomerId(Number(e.target.value))}>
                <option value="">Select Customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} (Outstanding: ₹{c.outstandingBalance})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" min="1" value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reference / UTR No.</Label>
              <Input value={paymentData.reference} onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => paymentMutation.mutate({ customerId: selectedCustomerId, ...paymentData, amount: Number(paymentData.amount) })} disabled={paymentMutation.isPending || !paymentData.amount || !selectedCustomerId}>
                {paymentMutation.isPending ? 'Processing...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
