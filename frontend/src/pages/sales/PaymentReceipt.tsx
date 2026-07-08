import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle } from 'lucide-react';
import api from '@/api/axios';

export default function PaymentReceipt() {
  const { paymentId } = useParams();

  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: ['payment-receipt', paymentId],
    queryFn: async () => (await api.get(`/sales/payments/${paymentId}/receipt`)).data,
    enabled: !!paymentId,
    retry: 1,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
    retry: 1,
  });

  if (receiptLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-xl text-slate-400">Receipt not found.</p>
      </div>
    );
  }

  const remainingBalance =
    receipt.remainingBalance !== null ? receipt.remainingBalance : null;

  const paymentMethodLabel: Record<string, string> = {
    CASH: 'Cash',
    UPI: 'UPI',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
    RAZORPAY: 'Online (Razorpay)',
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white flex justify-center">
      <div className="w-full max-w-2xl">

        {/* Controls - Hidden on print */}
        <div className="flex justify-end gap-3 mb-6 print:hidden">
          <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>

        {/* Receipt Card */}
        <div className="bg-white shadow-xl rounded-2xl print:shadow-none print:rounded-none overflow-hidden">

          {/* Green header strip */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-8 py-6 text-white print:bg-green-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Payment Receipt</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{receipt.receiptNumber || '—'}</h1>
              </div>
              <div className="text-right text-sm opacity-90">
                <p>{new Date(receipt.date).toLocaleDateString('en-IN', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}</p>
                <p className="mt-1 text-xs opacity-75">
                  {new Date(receipt.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Company & Customer Info */}
            <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">From</p>
                <h2 className="text-base font-bold text-slate-800">{settings?.companyName || 'My Company'}</h2>
                {settings?.address && <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{settings.address}</p>}
                {settings?.phone && <p className="text-xs text-slate-500">Ph: {settings.phone}</p>}
                {settings?.gstin && <p className="text-xs text-slate-600 font-semibold mt-1">GSTIN: {settings.gstin}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Received From</p>
                <h2 className="text-base font-bold text-slate-800">{receipt.customer?.name}</h2>
                {receipt.customer?.phone && <p className="text-xs text-slate-500 mt-1">Ph: {receipt.customer.phone}</p>}
                {receipt.customer?.email && <p className="text-xs text-slate-500">{receipt.customer.email}</p>}
                {receipt.customer?.gstNumber && (
                  <p className="text-xs text-slate-600 font-semibold mt-1">GSTIN: {receipt.customer.gstNumber}</p>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Payment Details</p>

              <div className="bg-slate-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {receipt.invoice && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 font-medium">Invoice No.</td>
                        <td className="px-4 py-3 text-slate-800 font-semibold text-right">
                          {receipt.invoice.invoiceNumber}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-slate-500 font-medium">Payment Method</td>
                      <td className="px-4 py-3 text-slate-800 font-semibold text-right">
                        {paymentMethodLabel[receipt.method] || receipt.method}
                      </td>
                    </tr>
                    {receipt.reference && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 font-medium">Reference / UTR</td>
                        <td className="px-4 py-3 text-slate-800 font-semibold text-right">{receipt.reference}</td>
                      </tr>
                    )}
                    {receipt.notes && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 font-medium">Notes</td>
                        <td className="px-4 py-3 text-slate-800 text-right">{receipt.notes}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Amount Block */}
            <div className="space-y-2">
              {receipt.invoice && (
                <div className="flex justify-between text-sm text-slate-500 px-1">
                  <span>Invoice Total</span>
                  <span className="font-medium text-slate-700">
                    ₹{receipt.invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {receipt.invoice && (
                <div className="flex justify-between text-sm text-slate-500 px-1">
                  <span>Previously Paid</span>
                  <span className="font-medium text-slate-700">
                    ₹{(receipt.invoice.paidAmount - receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Amount Paid - highlighted */}
              <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-xl px-4 py-4 mt-2">
                <span className="text-base font-bold text-green-800">Amount Paid Now</span>
                <span className="text-2xl font-bold text-green-700">
                  ₹{receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Remaining balance */}
              {remainingBalance !== null && (
                <div className={`flex justify-between items-center rounded-xl px-4 py-3 ${
                  remainingBalance <= 0
                    ? 'bg-green-100 border border-green-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  <span className={`text-sm font-semibold ${remainingBalance <= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                    {remainingBalance <= 0 ? '✓ Fully Paid' : 'Remaining Balance'}
                  </span>
                  <span className={`text-lg font-bold ${remainingBalance <= 0 ? 'text-green-700' : 'text-orange-600'}`}>
                    {remainingBalance <= 0
                      ? '₹0.00'
                      : `₹${remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-6 mt-4 border-t border-slate-100 flex justify-between items-end">
              <p className="text-xs text-slate-400">
                This is a computer-generated receipt and does not require a physical signature.
              </p>
              <div className="text-center w-40">
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
