import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Receipt, CheckCircle2, AlertCircle, BadgePercent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

interface InvoiceItem {
  modelId: string; colorId: string; sizeId: string; quantity: string; unitPrice: string; gstPercent: string;
}

interface PaymentResult {
  id: number;
  receiptNumber: string;
  amount: number;
  method: string;
  invoice?: { invoiceNumber: string; totalAmount: number; paidAmount: number };
  customer?: { name: string };
}

export default function SalesInvoices() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Invoice create dialog state
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', orderId: '' });
  const [items, setItems] = useState<InvoiceItem[]>([
    { modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' },
  ]);

  // Payment dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'CASH', reference: '', notes: '' });

  // Receipt modal state
  const [receiptResult, setReceiptResult] = useState<PaymentResult | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Settlement dialog state (Feature 2)
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleInvoice, setSettleInvoice] = useState<any>(null);
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [discountBase, setDiscountBase] = useState<'TOTAL' | 'REMAINING'>('REMAINING');
  const [discountInput, setDiscountInput] = useState('');

  // Payment History state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyInvoice, setHistoryInvoice] = useState<any>(null);

  /* ---------- Queries ---------- */
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['sales-invoices'],
    queryFn: async () => (await api.get('/sales/invoices')).data,
    retry: 1,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/masters/customers')).data,
    retry: 1,
  });
  const { data: models = [] } = useQuery({
    queryKey: ['shirt-models'],
    queryFn: async () => (await api.get('/masters/shirt-models')).data,
    retry: 1,
  });
  const { data: colors = [] } = useQuery({
    queryKey: ['colors'],
    queryFn: async () => (await api.get('/masters/colors')).data,
    retry: 1,
  });
  const { data: sizes = [] } = useQuery({
    queryKey: ['sizes'],
    queryFn: async () => (await api.get('/masters/sizes')).data,
    retry: 1,
  });

  /* ---------- Mutations ---------- */
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
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating invoice'),
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => api.post('/sales/payments', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentData({ amount: '', method: 'CASH', reference: '', notes: '' });
      // Show receipt confirmation modal
      setReceiptResult(res.data);
      setIsReceiptOpen(true);
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error processing payment'),
  });

  const proposeDiscountMutation = useMutation({
    mutationFn: async ({ invoiceId, discountPct, discountAmount }: any) =>
      api.patch(`/sales/invoices/${invoiceId}/discount`, { discountPct, discountAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      setIsSettleOpen(false);
      setSettleInvoice(null);
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error proposing discount'),
  });

  /* ---------- Helpers ---------- */
  const resetForm = () => {
    setFormData({ customerId: '', orderId: '' });
    setItems([{ modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]);
  };

  const addItem = () =>
    setItems([...items, { modelId: '', colorId: '', sizeId: '', quantity: '', unitPrice: '', gstPercent: '5' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string) => {
    const n = [...items];
    n[idx][field] = value;
    setItems(n);
  };

  const getLineTotal = (item: InvoiceItem) => {
    const sub = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sub + (sub * (Number(item.gstPercent) || 0)) / 100;
  };

  const openPaymentDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    const threshold = invoice.netPayable > 0 ? invoice.netPayable : invoice.totalAmount;
    const remaining = threshold - (invoice.paidAmount ?? 0);
    setPaymentData({ amount: Math.max(0, remaining).toFixed(2), method: 'CASH', reference: '', notes: '' });
    setIsPaymentDialogOpen(true);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((i) => !i.modelId || !i.colorId || !i.sizeId || !i.quantity || !i.unitPrice)) {
      alert('Please fill all item fields');
      return;
    }
    createInvoiceMutation.mutate({
      customerId: Number(formData.customerId),
      orderId: formData.orderId ? Number(formData.orderId) : null,
      items: items.map((i) => ({
        modelId: Number(i.modelId),
        colorId: Number(i.colorId),
        sizeId: Number(i.sizeId),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        gstPercent: Number(i.gstPercent),
      })),
    });
  };

  const handleRecordPayment = () => {
    if (!paymentData.amount || Number(paymentData.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    paymentMutation.mutate({
      customerId: selectedInvoice.customerId,
      invoiceId: selectedInvoice.id,
      amount: Number(paymentData.amount),
      method: paymentData.method,
      reference: paymentData.reference,
      notes: paymentData.notes,
    });
  };

  /* ---------- Computed values for payment dialog ---------- */
  const invoiceTotalAmount = selectedInvoice?.totalAmount ?? 0;
  const invoicePaidAmount = selectedInvoice?.paidAmount ?? 0;
  const invoiceDiscount = selectedInvoice?.proposedDiscountAmt ?? 0;
  const invoiceNetPayable = selectedInvoice?.netPayable > 0 ? selectedInvoice?.netPayable : invoiceTotalAmount;
  const invoiceRemainingBalance = invoiceNetPayable - invoicePaidAmount;
  const enteredAmount = Number(paymentData.amount) || 0;
  const afterPaymentBalance = invoiceRemainingBalance - enteredAmount;

  /* ---------- Status badge helper ---------- */
  const statusBadge = (status: string) => {
    if (status === 'PAID')    return <Badge className="bg-green-100 text-green-700 border border-green-200">✓ Paid</Badge>;
    if (status === 'PARTIAL') return <Badge className="bg-amber-100 text-amber-700 border border-amber-200">◑ Partial</Badge>;
    return <Badge variant="secondary">Unpaid</Badge>;
  };

  /* ---------- Columns ---------- */
  const columns = [
    { key: 'invoiceNumber', label: t('sales.columns.invoiceNo', 'Invoice No') },
    { key: 'customer',      label: t('sales.columns.customer', 'Customer'),    render: (row: any) => row.customer?.name || '-' },
    { key: 'items',         label: t('sales.columns.items', 'Items'),       render: (row: any) => `${row.items?.length || 0} lines` },
    {
      key: 'totalAmount', label: t('sales.columns.total', 'Invoice Total (₹)'),
      render: (row: any) => <span className="font-bold">₹{row.totalAmount?.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'discount', label: t('sales.columns.discount', 'Discount'),
      render: (row: any) => row.proposedDiscountPct > 0 
        ? <span className="text-amber-600 font-semibold">{Number(row.proposedDiscountPct).toLocaleString('en-IN', { maximumFractionDigits: 2 })}% (₹{row.proposedDiscountAmt.toLocaleString('en-IN')})</span> 
        : '-'
    },
    {
      key: 'netPayable', label: t('sales.columns.netPayable', 'Net Payable (₹)'),
      render: (row: any) => {
        const net = row.netPayable > 0 ? row.netPayable : row.totalAmount;
        return <span className="font-bold text-purple-700">₹{net.toLocaleString('en-IN')}</span>;
      }
    },
    {
      key: 'paidAmount', label: t('sales.columns.paid', 'Paid (₹)'),
      render: (row: any) => (
        <div className="flex flex-col gap-1 items-start">
          <span className="text-green-700 font-semibold">
            ₹{(row.paidAmount ?? 0).toLocaleString('en-IN')}
          </span>
          {(row.paidAmount > 0 || (row.payments && row.payments.length > 0)) && (
            <button 
              onClick={() => {
                setHistoryInvoice(row);
                setIsHistoryOpen(true);
              }}
              className="text-xs text-blue-600 hover:underline flex items-center"
            >
              View History
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'balance', label: t('sales.columns.balance', 'Balance (₹)'),
      render: (row: any) => {
        const net = row.netPayable > 0 ? row.netPayable : row.totalAmount;
        const bal = net - (row.paidAmount ?? 0);
        return (
          <span className={bal > 0 ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>
            ₹{bal.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    { key: 'status', label: t('sales.columns.status', 'Status'), render: (row: any) => statusBadge(row.status) },
    { key: 'date',   label: t('sales.columns.date', 'Date'),   render: (row: any) => new Date(row.date).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: t('sales.columns.actions', 'Actions'),
      render: (row: any) => (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => window.open(`/sales/invoice/${row.id}/print`, '_blank')}>
            {t('sales.actions.print', 'Print')}
          </Button>
          {row.proposedDiscountPct > 0 && row.status !== 'PAID' && (
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-200 bg-amber-50" onClick={() => window.open(`/sales/settlement-offer/${row.id}/print`, '_blank')}>
              {t('sales.actions.printOffer', 'Print Offer')}
            </Button>
          )}
          {row.status !== 'PAID' && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => openPaymentDialog(row)}
            >
              <Receipt className="h-3.5 w-3.5 mr-1" />
              {t('sales.actions.receivePayment', 'Receive Payment')}
            </Button>
          )}
          {row.status !== 'PAID' && (
            <Button
              size="sm"
              className={row.proposedDiscountPct > 0 ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"}
              onClick={() => {
                setSettleInvoice(row);
                if (row.proposedDiscountAmt > 0) {
                  setDiscountType('FLAT');
                  setDiscountInput(row.proposedDiscountAmt.toString());
                } else {
                  setDiscountType('FLAT');
                  setDiscountInput('');
                }
                setIsSettleOpen(true);
              }}
            >
              <BadgePercent className="h-3.5 w-3.5 mr-1" />
              {row.proposedDiscountPct > 0 ? t('sales.actions.editDiscount', 'Edit Discount') : t('sales.actions.setDiscount', 'Set Discount')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('sales.invoices.title', 'Sales Invoices')}</h1>

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        error={error}
        searchKey="invoiceNumber"
        onAdd={() => { resetForm(); setIsInvoiceDialogOpen(true); }}
      />

      {/* ── Create Invoice Dialog ── */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('sales.invoices.form.title', 'Generate Sales Invoice')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t('sales.invoices.form.customer', 'Customer *')}</Label>
              <AnimatedSelect
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                required
              >
                <option value="">{t('sales.invoices.form.selectCustomer', 'Select Customer')}</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.outstandingBalance > 0 ? `(₹${c.outstandingBalance} outstanding)` : ''}
                  </option>
                ))}
              </AnimatedSelect>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">{t('sales.invoices.form.invoiceItems', 'Invoice Items *')}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />{t('orders.form.addRow', 'Add Row')}
                </Button>
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-2 text-left">{t('sales.invoices.form.shirt', 'Shirt')}</th>
                      <th className="p-2 text-left">{t('orders.form.color', 'Color')}</th>
                      <th className="p-2 text-left">{t('orders.form.size', 'Size')}</th>
                      <th className="p-2 text-left">{t('orders.form.qty', 'Qty')}</th>
                      <th className="p-2 text-left">{t('sales.invoices.form.price', 'Price (₹)')}</th>
                      <th className="p-2 text-left">{t('sales.invoices.form.gst', 'GST%')}</th>
                      <th className="p-2 text-left">{t('common.total', 'Total')}</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1">
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-xs" value={item.modelId} onChange={(e) => updateItem(idx, 'modelId', e.target.value)} required>
                            <option value="">{t('common.select', 'Select')}</option>{models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-1">
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-xs" value={item.colorId} onChange={(e) => updateItem(idx, 'colorId', e.target.value)} required>
                            <option value="">{t('common.select', 'Select')}</option>{colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-1">
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-xs" value={item.sizeId} onChange={(e) => updateItem(idx, 'sizeId', e.target.value)} required>
                            <option value="">{t('common.select', 'Select')}</option>{sizes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-1"><AnimatedInput type="number" min="1" className="w-16 text-xs" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} required /></td>
                        <td className="p-1"><AnimatedInput type="number" min="0" className="w-24 text-xs" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} required /></td>
                        <td className="p-1">
                          <AnimatedSelect className="w-16 rounded border border-input px-1 py-1 text-xs" value={item.gstPercent} onChange={(e) => updateItem(idx, 'gstPercent', e.target.value)}>
                            <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option>
                          </AnimatedSelect>
                        </td>
                        <td className="p-1 font-medium text-xs">₹{getLineTotal(item).toFixed(2)}</td>
                        <td className="p-1">
                          {items.length > 1 && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50 border-t font-bold text-sm">
                    <tr>
                      <td colSpan={6} className="p-2 text-right">{t('sales.invoices.form.grandTotal', 'Grand Total:')}</td>
                      <td className="p-2 text-primary">₹{items.reduce((s, i) => s + getLineTotal(i), 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? t('sales.invoices.form.creating', 'Creating...') : t('sales.invoices.form.create', 'Create Invoice')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Receive Payment Dialog ── */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { if (!open) { setIsPaymentDialogOpen(false); setSelectedInvoice(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Receive Payment
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 pt-2">
              {/* Invoice summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice</span>
                  <span className="font-semibold text-slate-800">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-semibold text-slate-800">{selectedInvoice.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Total</span>
                  <span className="font-semibold text-slate-800">₹{invoiceTotalAmount.toLocaleString('en-IN')}</span>
                </div>
                {invoiceDiscount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Discount Offered</span>
                      <span className="font-semibold text-amber-600">
                        {selectedInvoice?.proposedDiscountPct}% (– ₹{invoiceDiscount.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Net Payable</span>
                      <span className="font-bold text-purple-700">₹{invoiceNetPayable.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid</span>
                  <span className="font-semibold text-green-700">₹{invoicePaidAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                  <span className="text-slate-700 font-semibold">Outstanding Balance</span>
                  <span className="font-bold text-orange-600 text-base">₹{invoiceRemainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <Label>Payment Amount (₹) *</Label>
                <AnimatedInput
                  type="number"
                  min="1"
                  max={invoiceRemainingBalance}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="text-lg font-semibold"
                  placeholder={`Max: ₹${invoiceRemainingBalance.toFixed(2)}`}
                />
                {/* Live remaining balance preview */}
                {enteredAmount > 0 && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    afterPaymentBalance <= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {afterPaymentBalance <= 0 ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>
                      {afterPaymentBalance <= 0
                        ? 'This payment will fully clear the invoice.'
                        : `Balance remaining after payment: ₹${afterPaymentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <AnimatedSelect
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={paymentData.method}
                  onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </AnimatedSelect>
              </div>

              {/* Reference */}
              <div className="space-y-2">
                <Label>Reference / UTR No.</Label>
                <AnimatedInput
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <AnimatedInput
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setIsPaymentDialogOpen(false); setSelectedInvoice(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={paymentMutation.isPending || !paymentData.amount || enteredAmount <= 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Receipt Success Modal ── */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Payment Recorded!</h2>

            {receiptResult && (
              <div className="w-full bg-slate-50 rounded-xl p-4 space-y-2 text-sm text-left border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No.</span>
                  <span className="font-bold text-slate-800">{receiptResult.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-bold text-green-700">
                    ₹{receiptResult.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {receiptResult.invoice && (
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                    <span className="text-slate-500">Balance Left</span>
                    <span className={`font-bold ${
                      receiptResult.invoice.totalAmount - receiptResult.invoice.paidAmount <= 0
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                      ₹{Math.max(0, receiptResult.invoice.totalAmount - receiptResult.invoice.paidAmount)
                          .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 w-full mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsReceiptOpen(false)}>
                Close
              </Button>
              {receiptResult && (
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    setIsReceiptOpen(false);
                    window.open(`/sales/receipt/${receiptResult.id}/print`, '_blank');
                  }}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Set Discount Dialog ── */}
      <Dialog open={isSettleOpen} onOpenChange={(o) => { if (!o) { setIsSettleOpen(false); setSettleInvoice(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgePercent className="h-5 w-5 text-purple-600" />
              Set Discount Offer
            </DialogTitle>
          </DialogHeader>

          {settleInvoice && (() => {
            const originalTotal  = settleInvoice.totalAmount ?? 0;
            const paid           = settleInvoice.paidAmount ?? 0;
            const remaining      = originalTotal - paid;
            
            let finalDiscountAmt = 0;
            let finalDiscountPct = 0;

            const inputVal = Number(discountInput) || 0;

            if (discountType === 'FLAT') {
              finalDiscountAmt = Math.min(inputVal, remaining); // Cannot discount more than remaining
              finalDiscountPct = originalTotal > 0 ? (finalDiscountAmt / originalTotal) * 100 : 0;
            } else {
              // PERCENTAGE
              finalDiscountPct = Math.min(100, Math.max(0, inputVal));
              const baseAmount = discountBase === 'TOTAL' ? originalTotal : remaining;
              finalDiscountAmt = parseFloat(((finalDiscountPct / 100) * baseAmount).toFixed(2));
              finalDiscountPct = originalTotal > 0 ? (finalDiscountAmt / originalTotal) * 100 : 0; // recalculate pct relative to total for display if needed, but we'll send the flat amount
            }

            const netDue = parseFloat((remaining - finalDiscountAmt).toFixed(2));

            return (
              <div className="space-y-4 pt-2">
                {/* Invoice summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice</span>
                    <span className="font-semibold text-slate-800">{settleInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Total</span>
                    <span className="text-slate-800">₹{originalTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Already Paid</span>
                    <span className="text-green-700">₹{paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                    <span className="font-semibold text-slate-700">Outstanding Balance</span>
                    <span className="font-bold text-orange-600 text-base">₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Discount Inputs */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant={discountType === 'FLAT' ? 'default' : 'outline'}
                      className={discountType === 'FLAT' ? 'flex-1 bg-purple-600 hover:bg-purple-700' : 'flex-1'}
                      onClick={() => setDiscountType('FLAT')}
                    >
                      Flat Amount (₹)
                    </Button>
                    <Button 
                      type="button" 
                      variant={discountType === 'PERCENTAGE' ? 'default' : 'outline'}
                      className={discountType === 'PERCENTAGE' ? 'flex-1 bg-purple-600 hover:bg-purple-700' : 'flex-1'}
                      onClick={() => setDiscountType('PERCENTAGE')}
                    >
                      Percentage (%)
                    </Button>
                  </div>

                  {discountType === 'PERCENTAGE' && (
                    <div className="space-y-2">
                      <Label>Apply Percentage To:</Label>
                      <AnimatedSelect
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={discountBase}
                        onChange={(e) => setDiscountBase(e.target.value as 'TOTAL' | 'REMAINING')}
                      >
                        <option value="TOTAL">Original Invoice Total (₹{originalTotal.toLocaleString('en-IN')})</option>
                        <option value="REMAINING">Remaining Balance (₹{remaining.toLocaleString('en-IN')})</option>
                      </AnimatedSelect>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{discountType === 'FLAT' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}</Label>
                    <div className="relative">
                      <AnimatedInput
                        type="number" min="0" step={discountType === 'FLAT' ? "1" : "0.1"}
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        placeholder={discountType === 'FLAT' ? "e.g. 2000" : "e.g. 10"}
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                        {discountType === 'FLAT' ? '₹' : '%'}
                      </span>
                    </div>
                    {finalDiscountAmt > 0 && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mt-2">
                        <span className="text-amber-700 font-medium">Calculated Discount:</span>
                        <span className="font-bold text-amber-800">
                          – ₹{finalDiscountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Net due */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex justify-between items-center mt-4">
                  <span className="text-sm font-semibold text-purple-800">New Net Payable Balance</span>
                  <span className="text-xl font-bold text-purple-700">
                    ₹{netDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <span className="font-bold">Note:</span> This is a proposal only. The invoice status will remain UNPAID/PARTIAL until actual payment is received.
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => { setIsSettleOpen(false); setSettleInvoice(null); }}>{t('common.cancel', 'Cancel')}</Button>
                  <Button
                    disabled={proposeDiscountMutation.isPending || netDue < 0}
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      proposeDiscountMutation.mutate({
                        invoiceId: settleInvoice.id,
                        discountPct: finalDiscountPct,
                        discountAmount: finalDiscountAmt
                      });
                    }}
                  >
                    {proposeDiscountMutation.isPending ? 'Saving...' : 'Save Discount'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Payment History Dialog ── */}
      <Dialog open={isHistoryOpen} onOpenChange={(o) => { if (!o) { setIsHistoryOpen(false); setHistoryInvoice(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              {t('sales.invoices.history.title', 'Payment History -')} {historyInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          {historyInvoice && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase">{t('sales.invoices.history.originalTotal', 'Original Total')}</p>
                  <p className="font-bold text-lg">₹{historyInvoice.totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 uppercase">{t('sales.invoices.history.totalPaid', 'Total Paid')}</p>
                  <p className="font-bold text-lg text-green-700">₹{(historyInvoice.paidAmount ?? 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-700 uppercase">{t('sales.invoices.history.balanceDue', 'Balance Due')}</p>
                  <p className="font-bold text-lg text-orange-700">
                    ₹{((historyInvoice.netPayable > 0 ? historyInvoice.netPayable : historyInvoice.totalAmount) - (historyInvoice.paidAmount ?? 0)).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {historyInvoice.payments && historyInvoice.payments.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t('common.date', 'Date')}</th>
                        <th className="px-4 py-3 font-medium">{t('sales.invoices.history.receiptNo', 'Receipt No.')}</th>
                        <th className="px-4 py-3 font-medium">{t('sales.invoices.history.method', 'Method')}</th>
                        <th className="px-4 py-3 font-medium text-right">{t('sales.invoices.history.amount', 'Amount (₹)')}</th>
                        <th className="px-4 py-3 font-medium text-center">{t('sales.invoices.history.action', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyInvoice.payments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{p.receiptNumber}</td>
                          <td className="px-4 py-3">{p.method}</td>
                          <td className="px-4 py-3 font-bold text-green-700 text-right">
                            {p.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              size="sm" variant="ghost" 
                              className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => window.open(`/sales/receipt/${p.id}/print`, '_blank')}
                            >
                              {t('common.print', 'Print')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                  {t('sales.invoices.history.noPayments', 'No payments recorded yet.')}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>





    </div>
  );
}
