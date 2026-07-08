import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Printer, Truck } from 'lucide-react';
import api from '@/api/axios';

const transportModeLabel: Record<string, string> = {
  ROAD: '1 - Road',
  RAIL: '2 - Rail',
  AIR:  '3 - Air',
  SHIP: '4 - Ship',
};

export default function EWayBillPrint() {
  const { id } = useParams();

  const { data: bill, isLoading: billLoading } = useQuery({
    queryKey: ['eway-bill', id],
    queryFn: async () => (await api.get(`/eway-bills/${id}`)).data,
    enabled: !!id,
    retry: 1,
  });

  const { data: settings, isLoading: setLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
    retry: 1,
  });

  if (billLoading || setLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-xl text-slate-400">E-Way Bill not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white flex justify-center">
      <div className="w-full max-w-3xl">

        {/* Controls */}
        <div className="flex justify-end gap-3 mb-6 print:hidden">
          <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="h-4 w-4 mr-2" />
            Print E-Way Bill
          </Button>
        </div>

        {/* E-Way Bill Document */}
        <div className="bg-white shadow-xl rounded-2xl print:shadow-none print:rounded-none overflow-hidden border border-slate-200 print:border-black">

          {/* Header */}
          <div className="border-b-2 border-slate-800 print:border-black px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-700 rounded-lg flex items-center justify-center print:bg-gray-800">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">E-Way Bill</h1>
                  <p className="text-xs text-slate-500">As per GST Rule 138 — Form EWB-01</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-700 font-mono print:text-black">{bill.ewbNumber}</p>
                <p className={`text-sm font-semibold mt-0.5 ${bill.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                  Status: {bill.status}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generated: {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Part A — Supplier & Recipient */}
          <div className="px-6 py-4 border-b border-slate-300">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Part A — Consignment Details</p>
            <div className="grid grid-cols-2 gap-6">

              {/* Supplier */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Supplier (From)</p>
                <h3 className="font-bold text-slate-800">{settings?.companyName || 'My Company'}</h3>
                {settings?.address && (
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{settings.address}</p>
                )}
                {settings?.phone && <p className="text-xs text-slate-500 mt-1">Ph: {settings.phone}</p>}
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase">GSTIN</p>
                  <p className="font-bold text-slate-800 font-mono text-sm">{bill.sellerGst}</p>
                </div>
                <div className="mt-1">
                  <p className="text-[10px] text-slate-500 uppercase">Place of Dispatch</p>
                  <p className="font-semibold text-slate-800">{bill.fromPlace}</p>
                </div>
              </div>

              {/* Recipient */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recipient (To)</p>
                <h3 className="font-bold text-slate-800">
                  {bill.buyerName || bill.invoice?.customer?.name || '—'}
                </h3>
                {(bill.buyerAddress || bill.invoice?.customer?.address) && (
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                    {bill.buyerAddress || bill.invoice?.customer?.address}
                  </p>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase">GSTIN</p>
                  <p className="font-bold text-slate-800 font-mono text-sm">
                    {bill.buyerGst || bill.invoice?.customer?.gstNumber || 'URP (Unregistered)'}
                  </p>
                </div>
                <div className="mt-1">
                  <p className="text-[10px] text-slate-500 uppercase">Place of Delivery</p>
                  <p className="font-semibold text-slate-800">{bill.toPlace}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Goods Details */}
          <div className="px-6 py-4 border-b border-slate-300">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Goods Details</p>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Description</p>
                <p className="font-semibold text-slate-800">
                  {bill.goodsDescription || (bill.invoice ? 'As per linked invoice' : '—')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">HSN Code</p>
                <p className="font-semibold text-slate-800 font-mono">{bill.hsnCode || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Total Value (₹)</p>
                <p className="font-bold text-slate-800 text-base">
                  ₹{bill.totalValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Linked Invoice</p>
                <p className="font-semibold text-indigo-700">
                  {bill.invoice?.invoiceNumber || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Part B — Vehicle Details */}
          <div className="px-6 py-4 border-b border-slate-300">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Part B — Vehicle / Transport Details</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Vehicle No.</p>
                    <p className="text-xl font-bold text-slate-900 font-mono tracking-wider border border-slate-300 rounded-lg px-3 py-1 bg-slate-50 mt-1">
                      {bill.vehicleNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Mode</p>
                    <p className="font-semibold text-slate-800 mt-1">
                      {transportModeLabel[bill.transportMode] || bill.transportMode}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Route</p>
                  <p className="font-semibold text-slate-800">
                    {bill.fromPlace} → {bill.toPlace}
                    {bill.distance ? <span className="text-slate-500 font-normal ml-2">({bill.distance} KM)</span> : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {bill.transporterName && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Transporter Name</p>
                    <p className="font-semibold text-slate-800">{bill.transporterName}</p>
                  </div>
                )}
                {bill.transporterId && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Transporter GSTIN</p>
                    <p className="font-semibold text-slate-800 font-mono">{bill.transporterId}</p>
                  </div>
                )}
                {bill.validUntil && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Valid Until</p>
                    <p className="font-bold text-red-600">
                      {new Date(bill.validUntil).toLocaleDateString('en-IN', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 print:bg-white">
            <div className="flex justify-between items-end">
              <div className="text-xs text-slate-400 space-y-1">
                <p>This E-Way Bill is generated by {settings?.companyName || 'My Company'} ERP.</p>
                <p>It is valid as proof of goods transport for GST inspection purposes.</p>
                <p className="font-semibold text-slate-600">
                  EWB No: {bill.ewbNumber} | Generated: {new Date(bill.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-center w-44">
                <div className="border-b border-slate-300 mb-2 h-10" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Authorized Signatory</p>
                <p className="text-[10px] text-slate-400">{settings?.companyName || 'My Company'}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
