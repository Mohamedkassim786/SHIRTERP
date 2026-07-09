import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Printer, BadgePercent } from 'lucide-react';
import api from '@/api/axios';

export default function DiscountInvoicePrint() {
  const { id } = useParams();

  const { data: invoice, isLoading: invLoading } = useQuery({
    queryKey: ['settlement-invoice', id],
    queryFn: async () => (await api.get(`/sales/invoices/${id}/settlement-print`)).data,
    enabled: !!id,
    retry: 1,
  });

  const { data: settings, isLoading: setLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
    retry: 1,
  });

  if (invLoading || setLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-xl text-slate-400">Invoice not found.</p>
      </div>
    );
  }

  const originalTotal   = invoice.totalAmount;
  const proposedDiscount = invoice.proposedDiscountAmt ?? 0;
  const proposedDiscountPct = invoice.proposedDiscountPct ?? 0;
  const totalPaid       = invoice.paidAmount ?? 0;
  const netPayable      = invoice.netPayable > 0 ? invoice.netPayable : originalTotal;
  const balanceDue      = netPayable - totalPaid;



  return (
    <div className="min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white flex justify-center">
      <div className="w-full max-w-3xl">

        {/* Controls */}
        <div className="flex justify-end gap-3 mb-6 print:hidden">
          <Button onClick={() => window.print()} className="bg-purple-600 hover:bg-purple-700">
            <Printer className="h-4 w-4 mr-2" />
            Print Settlement Invoice
          </Button>
        </div>

        <div className="bg-white shadow-xl rounded-2xl print:shadow-none print:rounded-none overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-6 text-white print:bg-amber-600">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BadgePercent className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-90">
                    Settlement Offer Proposal
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Ref: {invoice.invoiceNumber}</h1>
                <p className="text-sm opacity-90 mt-1">
                  Valid as of: {new Date().toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold">{settings?.companyName || 'My Company'}</h2>
                {settings?.gstin && (
                  <p className="text-sm opacity-75 mt-1">GSTIN: {settings.gstin}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Company & Customer */}
            <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Seller</p>
                <h3 className="font-bold text-slate-800">{settings?.companyName || 'My Company'}</h3>
                {settings?.address && <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{settings.address}</p>}
                {settings?.phone && <p className="text-xs text-slate-500">Ph: {settings.phone}</p>}
                {settings?.gstin && <p className="text-xs font-semibold text-slate-600 mt-1">GSTIN: {settings.gstin}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Buyer</p>
                <h3 className="font-bold text-slate-800">{invoice.customer?.name}</h3>
                {invoice.customer?.address && <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{invoice.customer.address}</p>}
                {invoice.customer?.phone && <p className="text-xs text-slate-500">Ph: {invoice.customer.phone}</p>}
                {invoice.customer?.gstNumber && (
                  <p className="text-xs font-semibold text-slate-600 mt-1">GSTIN: {invoice.customer.gstNumber}</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Items Supplied</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Item</th>
                      <th className="py-3 px-4 text-center font-semibold">Qty</th>
                      <th className="py-3 px-4 text-right font-semibold">Rate (₹)</th>
                      <th className="py-3 px-4 text-right font-semibold">GST</th>
                      <th className="py-3 px-4 text-right font-semibold">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{item.model?.name}</p>
                          <p className="text-xs text-slate-400">{item.color?.name} / {item.size?.name}</p>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">{item.gstPercent}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">
                          ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Settlement Summary */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-sm text-slate-500 px-1">
                  <span>Sub Total</span>
                  <span>₹{invoice.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 px-1 pb-2 border-b border-slate-200">
                  <span>Total GST</span>
                  <span>₹{invoice.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-700 font-semibold px-1">
                  <span>Original Invoice Total</span>
                  <span>₹{originalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 px-1 pb-2 border-b border-slate-200">
                  <span>Previously Paid</span>
                  <span className="text-green-700">
                    ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Discount row — highlighted */}
                {proposedDiscount > 0 && (
                  <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BadgePercent className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-800">Proposed Discount ({proposedDiscountPct}%)</span>
                    </div>
                    <span className="text-base font-bold text-amber-700">
                      – ₹{proposedDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Final Net Payable */}
                <div className="flex justify-between items-center bg-purple-50 border border-purple-200 rounded-xl px-4 py-4 mt-1">
                  <span className="text-base font-bold text-purple-800">Remaining Balance Due</span>
                  <span className="text-2xl font-bold text-purple-700">
                    ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            {(settings?.termsConditions || settings?.bankDetails) && (
              <div className="grid grid-cols-2 gap-6 pt-6 mt-4 border-t border-slate-100 text-xs text-slate-400">
                {settings.bankDetails && (
                  <div>
                    <p className="font-semibold text-slate-700 mb-1 uppercase">Bank Details</p>
                    <p className="whitespace-pre-wrap">{settings.bankDetails}</p>
                  </div>
                )}
                {settings.termsConditions && (
                  <div>
                    <p className="font-semibold text-slate-700 mb-1 uppercase">Terms & Conditions</p>
                    <p className="whitespace-pre-wrap">{settings.termsConditions}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-16 flex justify-between items-end">
              <p className="text-xs text-slate-400 max-w-xs">
                This is a computer-generated settlement invoice confirming full and final payment.
              </p>
              <div className="text-center w-44">
                <div className="border-b border-slate-300 mb-2 h-8" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Authorized Signatory</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
