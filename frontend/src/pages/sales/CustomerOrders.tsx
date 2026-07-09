import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { AnimatedDatePicker } from '@/components/ui/AnimatedDatePicker';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

interface OrderItem {
  modelId: string;
  colorId: string;
  sizeId: string;
  quantity: string;
  unitPrice: string;
}

export default function CustomerOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', deliveryDate: '' });
  const [items, setItems] = useState<OrderItem[]>([{ modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '' }]);

  const { data: orders = [] } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => (await api.get('/production/orders')).data,
    retry: 1
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/masters/customers')).data,
    retry: 1
  });

  const { data: models = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/masters/products')).data,
    retry: 1
  });

  const { data: colors = [] } = useQuery({
    queryKey: ['colors'],
    queryFn: async () => (await api.get('/masters/colors')).data,
    retry: 1
  });

  const { data: sizes = [] } = useQuery({
    queryKey: ['sizes'],
    queryFn: async () => (await api.get('/masters/sizes')).data,
    retry: 1
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => api.post('/production/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating order')
  });

  const pushToProductionMutation = useMutation({
    mutationFn: async (orderId: number) => api.post('/production/work-orders', { orderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error pushing to production. Ensure BOM is set up.')
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (order: any) => {
      const payload = {
        customerId: order.customerId,
        orderId: order.id,
        items: order.items.map((i: any) => ({
          modelId: i.modelId,
          colorId: i.colorId,
          sizeId: i.sizeId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          gstPercent: 5 // Default GST, ideally this comes from settings or the order item itself
        }))
      };
      return api.post('/sales/invoices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      alert('Order successfully converted to Invoice!');
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error converting to invoice')
  });

  const resetForm = () => {
    setFormData({ customerId: '', deliveryDate: '' });
    setItems([{ modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '' }]);
  };

  const addItem = () => setItems([...items, { modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof OrderItem, value: string) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.modelId || !i.colorId || !i.sizeId || !i.quantity)) {
      alert('Please fill all item fields');
      return;
    }
    createOrderMutation.mutate({ ...formData, items });
  };

  const statusColors: Record<string, any> = {
    PENDING: 'secondary', IN_PRODUCTION: 'default', READY: 'outline', DELIVERED: 'outline'
  };

  const columns = [
    { key: 'orderNumber', label: t('orders.cols.orderNumber', 'ORDER NUMBER') },
    { key: 'customer', label: t('orders.cols.customer', 'CUSTOMER'), render: (row: any) => row.customer?.name || '-' },
    { key: 'items', label: t('orders.cols.items', 'ITEMS'), render: (row: any) => `${row.items?.length || 0} ${t('orders.variants', 'variants')}` },
    { key: 'deliveryDate', label: t('orders.cols.deliveryDate', 'DELIVERY DATE'), render: (row: any) => row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString('en-IN') : '-' },
    {
      key: 'status', label: t('customers.cols.status', 'Status'), render: (row: any) => (
        <Badge variant={statusColors[row.status] || 'secondary'}>{row.status}</Badge>
      )
    },
    {
      key: 'actions', label: t('customers.cols.actions', 'ACTION'), render: (row: any) => (
        <div className="flex gap-2 items-center">
          {row.status === 'PENDING' && (
            <Button size="sm" onClick={() => pushToProductionMutation.mutate(row.id)} disabled={pushToProductionMutation.isPending}>
              {t('orders.pushToProduction', 'Push to Production')}
            </Button>
          )}
          {(row.status === 'READY' || row.status === 'PENDING') && (
            <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => convertToInvoiceMutation.mutate(row)} disabled={convertToInvoiceMutation.isPending}>
              {t('orders.convertToInvoice', 'Convert to Invoice')}
            </Button>
          )}
          {row.status === 'DELIVERED' && <span className="text-xs text-green-600 font-bold">✓ {t('orders.invoiced', 'Invoiced')}</span>}
          {row.status === 'IN_PRODUCTION' && <span className="text-xs text-blue-600 font-bold">{t('orders.inProduction', 'In Production')}</span>}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center shadow-lg shadow-pink-200/50">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('orders.title', 'Customer Orders')}</h1>
          <p className="text-sm text-slate-500">Create and track customer sales orders and delivery targets</p>
        </div>
      </div>
      <DataTable columns={columns} data={orders} searchKey="orderNumber" onAdd={() => { resetForm(); setIsDialogOpen(true); }} addLabel={t('common.addNew', 'Add New')} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('orders.form.title', 'Create Customer Order')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('orders.form.customer', 'Customer *')}</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })} required>
                  <option value="">{t('orders.form.selectCustomer', 'Select Customer')}</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AnimatedSelect>
              </div>
              <div className="space-y-2">
                <Label>{t('orders.form.deliveryDate', 'Delivery Date')}</Label>
                <AnimatedDatePicker value={formData.deliveryDate} onChange={val => setFormData({ ...formData, deliveryDate: val })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">{t('orders.form.orderItems', 'Order Items *')}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />{t('orders.form.addRow', 'Add Row')}</Button>
              </div>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-2 text-left">{t('orders.form.product', 'Product')}</th>
                      <th className="p-2 text-left">{t('orders.form.color', 'Color')}</th>
                      <th className="p-2 text-left">{t('orders.form.size', 'Size')}</th>
                      <th className="p-2 text-left">{t('orders.form.qty', 'Qty')}</th>
                      <th className="p-2 text-left">{t('orders.form.unitPrice', 'Unit Price (₹)')}</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-sm" value={item.modelId} onChange={e => updateItem(idx, 'modelId', e.target.value)} required>
                            <option value="">{t('common.select', 'Select')}</option>
                            {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-2">
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-sm" value={item.colorId} onChange={e => updateItem(idx, 'colorId', e.target.value)} required>
                            <option value="">{t('common.select', 'Select')}</option>
                            {colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-2">
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-sm" value={item.sizeId} onChange={e => updateItem(idx, 'sizeId', e.target.value)} required>
                            <option value="">{t('common.select', 'Select')}</option>
                            {sizes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-2"><AnimatedInput type="number" min="1" className="w-20" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required /></td>
                        <td className="p-2"><AnimatedInput type="number" min="0" className="w-28" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} /></td>
                        <td className="p-2">
                          {items.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? t('orders.form.creating', 'Creating...') : t('orders.form.create', 'Create Order')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
