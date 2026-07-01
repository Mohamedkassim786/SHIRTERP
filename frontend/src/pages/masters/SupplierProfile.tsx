import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { ArrowLeft, Truck, Phone, MapPin, Building, IndianRupee } from 'lucide-react';
import api from '@/api/axios';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TabType = 'purchase-orders' | 'payments';

export default function SupplierProfile() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('purchase-orders');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Bank Transfer', reference: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['supplier-profile', id],
    queryFn: async () => (await api.get(`/masters/suppliers/${id}/profile`)).data,
    retry: 1
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => api.post(`/masters/suppliers/${id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-dashboard'] });
      setIsPaymentDialogOpen(false);
      setPaymentForm({ amount: '', method: 'Bank Transfer', reference: '' });
      alert('Payment recorded successfully!');
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error recording payment')
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    paymentMutation.mutate(paymentForm);
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-red-500">Vendor not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/suppliers">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm hover:bg-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Vendor Profile</h1>
        <Badge variant="outline" className="ml-auto bg-white">
          {profile.category}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card className="glass md:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-200">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-600" />
              {profile.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Phone Number</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">{profile.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">GST Number</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">{profile.gstNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Address</p>
                  <p className="text-sm text-slate-900 mt-0.5">{profile.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card className="glass bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="pb-3 border-b border-orange-100/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-orange-600" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">We Owe Them</p>
              <p className={`text-3xl font-bold mt-1 ${profile.outstandingBalance > 0 ? 'text-orange-600' : 'text-slate-600'}`}>
                ₹{profile.outstandingBalance?.toLocaleString('en-IN') || 0}
              </p>
            </div>
            {profile.outstandingBalance > 0 && (
              <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setIsPaymentDialogOpen(true)}>
                Record Payment
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          {(['purchase-orders', 'payments'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab === 'purchase-orders' ? 'Purchase History' : 'Payment History'}
            </button>
          ))}
        </div>

        {activeTab === 'purchase-orders' && (
          <DataTable 
            columns={[
              { key: 'poNumber', label: 'PO No' },
              { key: 'date', label: 'Date', render: (r: any) => new Date(r.createdAt).toLocaleDateString('en-IN') },
              { key: 'totalAmount', label: 'Amount', render: (r: any) => `₹${r.totalAmount?.toLocaleString('en-IN')}` },
              { key: 'status', label: 'Status', render: (r: any) => (
                <Badge variant={r.status === 'COMPLETED' ? 'default' : r.status === 'CANCELLED' ? 'destructive' : 'secondary'}>{r.status}</Badge>
              )}
            ]} 
            data={profile.purchaseOrders || []} 
            searchKey="poNumber" 
          />
        )}

        {activeTab === 'payments' && (
          <DataTable 
            columns={[
              { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
              { key: 'method', label: 'Method' },
              { key: 'reference', label: 'Reference No' },
              { key: 'amount', label: 'Amount', render: (r: any) => <span className="font-bold text-orange-600">₹{r.amount?.toLocaleString('en-IN')}</span> },
            ]} 
            data={profile.payments || []} 
            searchKey="reference" 
          />
        )}
      </div>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment to {profile.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Transaction ID, Cheque No, etc." />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={paymentMutation.isPending}>{paymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
