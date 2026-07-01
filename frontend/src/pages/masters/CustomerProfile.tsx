import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { ArrowLeft, User, Phone, MapPin, Building, IndianRupee, Clock, CheckCircle, Plus } from 'lucide-react';
import api from '@/api/axios';

type TabType = 'invoices' | 'payments' | 'reminders';

export default function CustomerProfile() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderForm, setReminderForm] = useState({ title: '', notes: '', dueDate: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['customer-profile', id],
    queryFn: async () => (await api.get(`/masters/customers/${id}/profile`)).data,
    retry: 1
  });

  const createReminderMutation = useMutation({
    mutationFn: async (data: any) => api.post('/masters/reminders', { ...data, customerId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-profile', id] });
      setShowReminderForm(false);
      setReminderForm({ title: '', notes: '', dueDate: '' });
    }
  });

  const toggleReminderMutation = useMutation({
    mutationFn: async (reminder: any) => api.put(`/masters/reminders/${reminder.id}/status`, { 
      status: reminder.status === 'PENDING' ? 'COMPLETED' : 'PENDING' 
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-profile', id] })
  });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-red-500">Customer not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/customers">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm hover:bg-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Customer Profile</h1>
        <Badge variant={profile.type === 'WHOLESALE' ? 'default' : profile.type === 'DISTRIBUTOR' ? 'destructive' : 'secondary'} className="ml-auto">
          {profile.type}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card className="glass md:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-200">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
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
        <Card className="glass bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader className="pb-3 border-b border-indigo-100/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-indigo-600" />
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Current Outstanding</p>
              <p className={`text-3xl font-bold mt-1 ${profile.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{profile.outstandingBalance?.toLocaleString('en-IN') || 0}
              </p>
            </div>
            <div className="pt-4 border-t border-indigo-100/50">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Lifetime Revenue</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{profile.totalRevenue?.toLocaleString('en-IN') || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          {(['invoices', 'payments', 'reminders'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'invoices' && (
          <DataTable 
            columns={[
              { key: 'invoiceNumber', label: 'Invoice No' },
              { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
              { key: 'totalAmount', label: 'Amount', render: (r: any) => `₹${r.totalAmount?.toLocaleString('en-IN')}` },
              { key: 'status', label: 'Status', render: (r: any) => <Badge variant={r.status === 'PAID' ? 'default' : 'secondary'}>{r.status}</Badge> }
            ]} 
            data={profile.invoices || []} 
            searchKey="invoiceNumber" 
          />
        )}

        {activeTab === 'payments' && (
          <DataTable 
            columns={[
              { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
              { key: 'method', label: 'Method' },
              { key: 'reference', label: 'Reference No' },
              { key: 'amount', label: 'Amount', render: (r: any) => <span className="font-bold text-green-600">+₹{r.amount?.toLocaleString('en-IN')}</span> },
            ]} 
            data={profile.payments || []} 
            searchKey="reference" 
          />
        )}

        {activeTab === 'reminders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-700">Follow-up Reminders</h3>
              <Button size="sm" onClick={() => setShowReminderForm(!showReminderForm)}>
                <Plus className="h-4 w-4 mr-1" /> Add Reminder
              </Button>
            </div>

            {showReminderForm && (
              <Card className="glass animate-slide-up bg-slate-50/50 mb-6">
                <CardContent className="pt-6">
                  <form onSubmit={e => { e.preventDefault(); createReminderMutation.mutate(reminderForm); }} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Follow-up Title</Label>
                        <Input required value={reminderForm.title} onChange={e => setReminderForm({...reminderForm, title: e.target.value})} placeholder="e.g. Call regarding overdue payment" />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input type="date" required value={reminderForm.dueDate} onChange={e => setReminderForm({...reminderForm, dueDate: e.target.value})} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Notes (Optional)</Label>
                        <Input value={reminderForm.notes} onChange={e => setReminderForm({...reminderForm, notes: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setShowReminderForm(false)}>Cancel</Button>
                      <Button type="submit" disabled={createReminderMutation.isPending}>Save Reminder</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.reminders?.length === 0 && <p className="text-slate-400 text-sm">No reminders set for this customer.</p>}
              {profile.reminders?.map((rem: any) => (
                <Card key={rem.id} className={`glass ${rem.status === 'COMPLETED' ? 'opacity-60 bg-slate-50/50' : 'border-l-4 border-l-orange-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-semibold text-sm ${rem.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{rem.title}</h4>
                      <button 
                        onClick={() => toggleReminderMutation.mutate(rem)}
                        className={`p-1 rounded-full hover:bg-slate-200 transition-colors ${rem.status === 'COMPLETED' ? 'text-green-600' : 'text-slate-300 hover:text-green-500'}`}
                        title={rem.status === 'COMPLETED' ? 'Mark as Pending' : 'Mark as Completed'}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{rem.notes}</p>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-white inline-flex px-2 py-1 rounded-md border border-slate-200">
                      <Clock className="h-3 w-3 text-orange-500" />
                      Due: {new Date(rem.dueDate).toLocaleDateString('en-IN')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
