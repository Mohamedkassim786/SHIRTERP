import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Truck, FileText, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

const transportModes = ['ROAD', 'RAIL', 'AIR', 'SHIP'];

const defaultForm = {
  invoiceId: '',
  sellerGst: '',
  buyerGst: '',
  buyerName: '',
  buyerAddress: '',
  vehicleNumber: '',
  transporterName: '',
  transporterId: '',
  fromPlace: '',
  toPlace: '',
  distance: '',
  transportMode: 'ROAD',
  goodsDescription: '',
  totalValue: '',
  hsnCode: '',
};

export default function EWayBills() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  /* ---------- Queries ---------- */
  const { data: bills = [], isLoading, error } = useQuery({
    queryKey: ['eway-bills'],
    queryFn: async () => (await api.get('/eway-bills')).data,
    retry: 1,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['sales-invoices'],
    queryFn: async () => (await api.get('/sales/invoices')).data,
    retry: 1,
  });

  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
    retry: 1,
  });

  /* ---------- Mutations ---------- */
  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/eway-bills', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eway-bills'] });
      setIsDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating E-Way Bill'),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => api.patch(`/eway-bills/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eway-bills'] }),
    onError: (e: any) => alert(e.response?.data?.message || 'Error cancelling E-Way Bill'),
  });

  /* ---------- Helpers ---------- */
  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const openDialog = () => {
    setForm({ ...defaultForm, sellerGst: settings?.gstin || '' });
    setIsDialogOpen(true);
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = invoices.find((i: any) => String(i.id) === invoiceId);
    setForm((f) => ({
      ...f,
      invoiceId,
      totalValue: inv ? String(inv.totalAmount) : f.totalValue,
      buyerName: inv?.customer?.name || f.buyerName,
      buyerGst: inv?.customer?.gstNumber || f.buyerGst,
      buyerAddress: inv?.customer?.address || f.buyerAddress,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      invoiceId: form.invoiceId ? Number(form.invoiceId) : null,
      distance: form.distance ? Number(form.distance) : null,
      totalValue: Number(form.totalValue) || 0,
    });
  };

  /* ---------- Status badge ---------- */
  const statusBadge = (status: string) =>
    status === 'ACTIVE'
      ? <Badge className="bg-green-100 text-green-700 border border-green-200">{t('common.active', 'Active')}</Badge>
      : <Badge variant="destructive">{t('eway.cancelled', 'Cancelled')}</Badge>;

  /* ---------- Columns ---------- */
  const columns = [
    {
      key: 'ewbNumber', label: t('eway.cols.ewbNo', 'EWB NO.'),
      render: (r: any) => <span className="font-mono font-bold text-indigo-700">{r.ewbNumber}</span>
    },
    {
      key: 'invoice', label: t('eway.cols.invoice', 'INVOICE'),
      render: (r: any) => r.invoice?.invoiceNumber || <span className="text-slate-400">—</span>
    },
    {
      key: 'vehicleNumber', label: t('eway.cols.vehicleNo', 'VEHICLE NO.'),
      render: (r: any) => <span className="font-semibold">{r.vehicleNumber}</span>
    },
    {
      key: 'route', label: t('eway.cols.route', 'ROUTE'),
      render: (r: any) => <span className="text-sm">{r.fromPlace} → {r.toPlace}</span>
    },
    {
      key: 'transportMode', label: t('eway.cols.mode', 'MODE'),
      render: (r: any) => <Badge variant="outline">{r.transportMode}</Badge>
    },
    {
      key: 'totalValue', label: t('eway.cols.value', 'VALUE (₹)'),
      render: (r: any) => <span className="font-semibold">₹{r.totalValue?.toLocaleString('en-IN')}</span>
    },
    {
      key: 'validUntil', label: t('eway.cols.validUntil', 'VALID UNTIL'),
      render: (r: any) => r.validUntil
        ? new Date(r.validUntil).toLocaleDateString('en-IN')
        : <span className="text-slate-400">—</span>
    },
    { key: 'status', label: t('customers.cols.status', 'STATUS'), render: (r: any) => statusBadge(r.status) },
    {
      key: 'actions', label: t('customers.cols.actions', 'ACTIONS'),
      render: (r: any) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline"
            onClick={() => window.open(`/eway-bills/${r.id}/print`, '_blank')}>
            <FileText className="h-3.5 w-3.5 mr-1" />
            {t('common.print', 'Print')}
          </Button>
          {r.status === 'ACTIVE' && (
            <Button size="sm" variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => { if (confirm('Cancel this E-Way Bill?')) cancelMutation.mutate(r.id); }}>
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('eway.title', 'E-Way Bills')}</h1>
          <p className="text-sm text-slate-500">Generate GST-compliant E-Way Bills for goods transport</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={bills}
        isLoading={isLoading}
        error={error}
        searchKey="ewbNumber"
        onAdd={openDialog}
      />

      {/* ── Create E-Way Bill Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-600" />
              {t('eway.form.title', 'Generate E-Way Bill')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">

            {/* Invoice Link */}
            <div className="space-y-2">
              <Label>{t('eway.form.linkInvoice', 'Link to Invoice')} <span className="text-slate-400 text-xs">({t('common.optional', 'optional')})</span></Label>
              <AnimatedSelect
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.invoiceId}
                onChange={(e) => handleInvoiceSelect(e.target.value)}
              >
                <option value="">— {t('eway.form.noLinked', 'No linked invoice')} —</option>
                {invoices.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} – {inv.customer?.name} (₹{inv.totalAmount?.toLocaleString('en-IN')})
                  </option>
                ))}
              </AnimatedSelect>
            </div>

            {/* GST Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('eway.form.sellerGst', 'Seller GSTIN *')}</Label>
                <AnimatedInput value={form.sellerGst} onChange={(e) => set('sellerGst', e.target.value)} placeholder="27AAAPZ3290K1Z6" required />
              </div>
              <div className="space-y-2">
                <Label>{t('eway.form.buyerGst', 'Buyer GSTIN')} <span className="text-slate-400 text-xs">({t('common.optional', 'optional')})</span></Label>
                <AnimatedInput value={form.buyerGst} onChange={(e) => set('buyerGst', e.target.value)} placeholder="29AAGCC5071K1ZG" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('eway.form.buyerName', 'Buyer Name')}</Label>
                <AnimatedInput value={form.buyerName} onChange={(e) => set('buyerName', e.target.value)} placeholder={t('eway.form.buyerNamePh', 'Customer / Company Name')} />
              </div>
              <div className="space-y-2">
                <Label>{t('eway.form.buyerAddress', 'Buyer Address')}</Label>
                <AnimatedInput value={form.buyerAddress} onChange={(e) => set('buyerAddress', e.target.value)} placeholder={t('eway.form.buyerAddressPh', 'City, State')} />
              </div>
            </div>

            {/* Transport Details */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">{t('eway.form.transportDetails', 'Transport Details')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('eway.form.vehicleNum', 'Vehicle Number *')}</Label>
                  <AnimatedInput
                    value={form.vehicleNumber}
                    onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())}
                    placeholder="TN 01 AB 1234"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('eway.form.transportMode', 'Transport Mode')}</Label>
                  <AnimatedSelect
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.transportMode}
                    onChange={(e) => set('transportMode', e.target.value)}
                  >
                    {transportModes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </AnimatedSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>{t('eway.form.transporterName', 'Transporter Name')}</Label>
                  <AnimatedInput value={form.transporterName} onChange={(e) => set('transporterName', e.target.value)} placeholder={t('common.optionalPlaceholder', 'Optional')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('eway.form.transporterGst', 'Transporter GSTIN')}</Label>
                  <AnimatedInput value={form.transporterId} onChange={(e) => set('transporterId', e.target.value)} placeholder={t('common.optionalPlaceholder', 'Optional')} />
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">{t('eway.form.route', 'Route')}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('eway.form.fromPlace', 'From Place *')}</Label>
                  <AnimatedInput value={form.fromPlace} onChange={(e) => set('fromPlace', e.target.value)} placeholder="Coimbatore" required />
                </div>
                <div className="space-y-2">
                  <Label>{t('eway.form.toPlace', 'To Place *')}</Label>
                  <AnimatedInput value={form.toPlace} onChange={(e) => set('toPlace', e.target.value)} placeholder="Chennai" required />
                </div>
                <div className="space-y-2">
                  <Label>{t('eway.form.distance', 'Distance (KM)')}</Label>
                  <AnimatedInput type="number" min="1" value={form.distance} onChange={(e) => set('distance', e.target.value)} placeholder="500" />
                </div>
              </div>
            </div>

            {/* Goods */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">{t('eway.form.goodsDetails', 'Goods Details')}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>{t('eway.form.goodsDesc', 'Goods Description')}</Label>
                  <AnimatedInput value={form.goodsDescription} onChange={(e) => set('goodsDescription', e.target.value)} placeholder="Men's Shirts — Cotton" />
                </div>
                <div className="space-y-2">
                  <Label>{t('eway.form.hsnCode', 'HSN Code')}</Label>
                  <AnimatedInput value={form.hsnCode} onChange={(e) => set('hsnCode', e.target.value)} placeholder="6205" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>{t('eway.form.totalValue', 'Total Taxable Value (₹) *')}</Label>
                <AnimatedInput type="number" min="0" value={form.totalValue} onChange={(e) => set('totalValue', e.target.value)} placeholder="50000" required />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {createMutation.isPending ? t('eway.form.generating', 'Generating...') : t('eway.form.generate', 'Generate E-Way Bill')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
