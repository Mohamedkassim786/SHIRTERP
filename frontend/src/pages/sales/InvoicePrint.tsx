import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Printer, CreditCard } from 'lucide-react';
import api from '@/api/axios';

export default function InvoicePrint() {
  const { id } = useParams();

  const { data: invoice, isLoading: invoiceLoading, refetch } = useQuery({
    queryKey: ['sales-invoice', id],
    queryFn: async () => (await api.get(`/sales/invoices/${id}`)).data,
    enabled: !!id,
    retry: 1
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
    retry: 1
  });

  if (invoiceLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-slate-400">Invoice not found.</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handlePayment = async () => {
    try {
      const orderRes = await api.post('/payments/create-order', {
        amount: invoice.totalAmount,
        receipt: invoice.invoiceNumber
      });
      const order = orderRes.data;

      const options = {
        key: settings?.razorpayKeyId?.trim() || import.meta.env.VITE_RAZORPAY_KEY_ID?.trim(),
        amount: order.amount,
        currency: order.currency,
        name: settings?.companyName || 'My Company',
        description: `Payment for Invoice #${invoice.invoiceNumber}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await api.post('/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: invoice.id,
              customerId: invoice.customerId,
              amount: invoice.totalAmount
            });
            alert('Payment Successful & Verified!');
            refetch();
          } catch (e: any) {
            console.error(e);
            alert('Payment verification failed: ' + (e.response?.data?.message || e.message));
          }
        },
        prefill: {
          name: invoice.customer?.name,
          email: invoice.customer?.email || 'test@example.com',
          contact: invoice.customer?.phone || '9999999999'
        },
        theme: {
          color: '#4f46e5'
        }
      };
      
      if (!options.key) {
        alert('Razorpay Key ID is not configured. Please configure it in Settings.');
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert('Payment Failed: ' + response.error.description);
      });
      rzp.open();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || 'Error initiating payment');
    }
  };

  return (
    <div className="min-h-screen bg-white py-8 print:py-0 print:bg-white flex justify-center">
      <div className="w-full max-w-4xl bg-white shadow-lg print:shadow-none p-8 print:p-0">
        
        {/* Controls - Hidden on print */}
        <div className="flex justify-end gap-3 mb-8 print:hidden">
          {invoice.status !== 'PAID' && (
            <Button onClick={handlePayment} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Online via Razorpay
            </Button>
          )}
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>

        {/* Invoice Container */}
        <div className="space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Invoice</h1>
              <p className="text-sm text-slate-400 mt-1"># {invoice.invoiceNumber}</p>
              <p className="text-sm text-slate-400">
                Date: {new Date(invoice.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right max-w-xs">
              <h2 className="text-xl font-bold text-slate-700">{settings?.companyName || 'My Company'}</h2>
              {settings?.address && <p className="text-sm text-slate-400 whitespace-pre-wrap mt-1">{settings.address}</p>}
              {settings?.phone && <p className="text-sm text-slate-400 mt-1">Ph: {settings.phone}</p>}
              {settings?.email && <p className="text-sm text-slate-400">Email: {settings.email}</p>}
              {settings?.gstin && <p className="text-sm font-semibold text-slate-600 mt-1">GSTIN: {settings.gstin}</p>}
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
              <h3 className="text-lg font-bold text-slate-700">{invoice.customer?.name}</h3>
              {invoice.customer?.address && <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{invoice.customer.address}</p>}
              {invoice.customer?.phone && <p className="text-sm text-slate-400 mt-1">Ph: {invoice.customer.phone}</p>}
              {invoice.customer?.email && <p className="text-sm text-slate-400">Email: {invoice.customer.email}</p>}
              {invoice.customer?.gstNumber && <p className="text-sm font-semibold text-slate-600 mt-1">GSTIN: {invoice.customer.gstNumber}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Status</p>
              <p className={`text-lg font-bold ${invoice.status === 'PAID' ? 'text-green-600' : 'text-orange-500'}`}>
                {invoice.status}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="pt-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-700">
                  <th className="py-3 px-2 font-semibold">Item Details</th>
                  <th className="py-3 px-2 font-semibold text-center">Qty</th>
                  <th className="py-3 px-2 font-semibold text-right">Rate</th>
                  <th className="py-3 px-2 font-semibold text-right">GST %</th>
                  <th className="py-3 px-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 px-2">
                      <p className="font-medium text-slate-700">{item.model?.name}</p>
                      <p className="text-xs text-slate-400">Color: {item.color?.name} | Size: {item.size?.name}</p>
                    </td>
                    <td className="py-3 px-2 text-center">{item.quantity}</td>
                    <td className="py-3 px-2 text-right">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-2 text-right">{item.gstPercent}%</td>
                    <td className="py-3 px-2 text-right font-medium text-slate-700">
                      ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4">
            <div className="w-full max-w-sm">
              <div className="flex justify-between py-2 text-sm text-slate-400">
                <span>Subtotal</span>
                <span>₹{invoice.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 text-sm text-slate-400 border-b">
                <span>Total GST</span>
                <span>₹{invoice.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-3 text-lg font-bold text-white border-b-2 border-slate-800">
                <span>Grand Total</span>
                <span>₹{invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          {(settings?.bankDetails || settings?.termsConditions) && (
            <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t text-xs text-slate-400">
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

          {/* Authorized Signature */}
          <div className="pt-24 flex justify-end">
            <div className="text-center w-48">
              <div className="border-b border-slate-400 mb-2"></div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Authorized Signatory</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
