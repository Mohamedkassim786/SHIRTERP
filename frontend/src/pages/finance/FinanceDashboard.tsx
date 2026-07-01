import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Landmark, TrendingUp, TrendingDown, IndianRupee, FileText, Activity } from 'lucide-react';
import api from '@/api/axios';

type Tab = 'overview' | 'daybook' | 'accounts';

export default function FinanceDashboard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  
  // Modals
  const [isTxnOpen, setIsTxnOpen] = useState(false);
  const [isAccOpen, setIsAccOpen] = useState(false);
  
  // Forms
  const [accForm, setAccForm] = useState({ name: '', type: 'ASSET' });
  const [txnForm, setTxnForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', description: '', reference: '', debitAccountId: '', creditAccountId: '' });

  // Data fetching
  const { data: dashboard, isLoading: dashLoading } = useQuery({ queryKey: ['finance-dashboard'], queryFn: async () => (await api.get('/finance/dashboard')).data, retry: 1 });
  const { data: accounts = [], isLoading: accLoading } = useQuery({ queryKey: ['finance-accounts'], queryFn: async () => (await api.get('/finance/accounts')).data, retry: 1 });
  const { data: transactions = [], isLoading: txnLoading } = useQuery({ queryKey: ['finance-transactions'], queryFn: async () => (await api.get('/finance/transactions')).data, retry: 1 });

  // Mutations
  const accMutation = useMutation({
    mutationFn: async (data: any) => api.post('/finance/accounts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['finance-accounts'] }); setIsAccOpen(false); setAccForm({ name: '', type: 'ASSET' }); },
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating account')
  });

  const txnMutation = useMutation({
    mutationFn: async (data: any) => api.post('/finance/transactions', data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] }); 
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      setIsTxnOpen(false); 
      setTxnForm({ date: new Date().toISOString().split('T')[0], amount: '', description: '', reference: '', debitAccountId: '', creditAccountId: '' }); 
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error creating transaction')
  });

  const handleAccSubmit = (e: React.FormEvent) => { e.preventDefault(); accMutation.mutate(accForm); };
  const handleTxnSubmit = (e: React.FormEvent) => { e.preventDefault(); txnMutation.mutate(txnForm); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Accounts & Finance</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsTxnOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800">
            <Activity className="h-4 w-4 mr-1" /> New Transaction
          </Button>
          <Button variant="outline" onClick={() => setIsAccOpen(true)}>
            <Landmark className="h-4 w-4 mr-1" /> New Account
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(['overview', 'daybook', 'accounts'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
          >
            {t === 'overview' && <IndianRupee className="h-4 w-4 inline mr-1.5" />}
            {t === 'daybook' && <FileText className="h-4 w-4 inline mr-1.5" />}
            {t === 'accounts' && <Landmark className="h-4 w-4 inline mr-1.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass border-l-4 border-l-green-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{dashboard?.totalRevenue?.toLocaleString('en-IN') || 0}</p>
              </CardContent>
            </Card>
            <Card className="glass border-l-4 border-l-red-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{dashboard?.totalExpense?.toLocaleString('en-IN') || 0}</p>
              </CardContent>
            </Card>
            <Card className="glass border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">Net Profit</p>
                <p className={`text-2xl font-bold mt-1 ${dashboard?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{dashboard?.netProfit?.toLocaleString('en-IN') || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-l-4 border-l-indigo-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">Total Assets (Cash/Bank)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{dashboard?.totalAssets?.toLocaleString('en-IN') || 0}</p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="glass">
            <CardHeader><CardTitle>Balance Sheet Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg text-slate-700 border-b pb-2 mb-4">Assets</h3>
                  {accounts.filter((a: any) => a.type === 'ASSET').map((a: any) => (
                    <div key={a.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600">{a.name}</span>
                      <span className="font-medium">₹{a.balance.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 mt-2 border-t-2 font-bold text-slate-900">
                    <span>Total Assets</span>
                    <span>₹{dashboard?.totalAssets?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-700 border-b pb-2 mb-4">Liabilities & Equity</h3>
                  {accounts.filter((a: any) => a.type === 'LIABILITY' || a.type === 'EQUITY').map((a: any) => (
                    <div key={a.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600">{a.name}</span>
                      <span className="font-medium">₹{a.balance.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 mt-2 border-t-2 font-bold text-slate-900">
                    <span>Total Liabilities</span>
                    <span>₹{dashboard?.totalLiabilities?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {tab === 'accounts' && (
        <DataTable
          columns={[
            { key: 'name', label: 'Account Name', render: (r: any) => <span className="font-medium">{r.name}</span> },
            { key: 'type', label: 'Type', render: (r: any) => <Badge variant="outline">{r.type}</Badge> },
            { key: 'balance', label: 'Current Balance', render: (r: any) => (
              <span className={`font-bold ${(r.type === 'ASSET' || r.type === 'REVENUE') ? 'text-green-600' : (r.type === 'EXPENSE' || r.type === 'LIABILITY') ? 'text-red-600' : 'text-slate-700'}`}>
                ₹{r.balance.toLocaleString('en-IN')}
              </span>
            )},
            { key: 'isSystem', label: 'System', render: (r: any) => r.isSystem ? <Badge>System</Badge> : <span className="text-xs text-slate-400">Custom</span> }
          ]}
          data={accounts}
          searchKey="name"
          isLoading={accLoading}
        />
      )}

      {/* DAYBOOK TAB */}
      {tab === 'daybook' && (
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
            { key: 'description', label: 'Description', render: (r: any) => (
              <div>
                <p className="font-medium text-slate-900">{r.description}</p>
                {r.reference && <p className="text-xs text-slate-500">Ref: {r.reference}</p>}
              </div>
            )},
            { key: 'debit', label: 'Debit Account (In)', render: (r: any) => <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">{r.debitAccount?.name}</Badge> },
            { key: 'credit', label: 'Credit Account (Out)', render: (r: any) => <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">{r.creditAccount?.name}</Badge> },
            { key: 'amount', label: 'Amount', render: (r: any) => <span className="font-bold text-slate-900">₹{r.amount.toLocaleString('en-IN')}</span> }
          ]}
          data={transactions}
          searchKey="description"
          isLoading={txnLoading}
        />
      )}

      {/* Create Account Modal */}
      <Dialog open={isAccOpen} onOpenChange={setIsAccOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Ledger Account</DialogTitle></DialogHeader>
          <form onSubmit={handleAccSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input required placeholder="e.g. SBI Checking, Rent Expense" value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Account Type *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={accForm.type} onChange={e => setAccForm({ ...accForm, type: e.target.value })}>
                <option value="ASSET">Asset (Bank, Cash, Inventory)</option>
                <option value="LIABILITY">Liability (Loans, Payables)</option>
                <option value="EQUITY">Equity (Capital)</option>
                <option value="REVENUE">Revenue (Sales, Income)</option>
                <option value="EXPENSE">Expense (Rent, Salaries, COGS)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAccOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={accMutation.isPending}>Create Account</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Transaction Modal */}
      <Dialog open={isTxnOpen} onOpenChange={setIsTxnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Journal Transaction</DialogTitle></DialogHeader>
          <form onSubmit={handleTxnSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" required value={txnForm.date} onChange={e => setTxnForm({ ...txnForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" required min="1" value={txnForm.amount} onChange={e => setTxnForm({ ...txnForm, amount: e.target.value })} />
              </div>
            </div>
            
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="space-y-2">
                <Label className="text-green-600">Debit (Money received by) *</Label>
                <select required className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={txnForm.debitAccountId} onChange={e => setTxnForm({ ...txnForm, debitAccountId: e.target.value })}>
                  <option value="">Select Account</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-red-600">Credit (Money given by) *</Label>
                <select required className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={txnForm.creditAccountId} onChange={e => setTxnForm({ ...txnForm, creditAccountId: e.target.value })}>
                  <option value="">Select Account</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Input required placeholder="e.g. Paid office rent" value={txnForm.description} onChange={e => setTxnForm({ ...txnForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reference No (Optional)</Label>
              <Input placeholder="Invoice / Cheque No" value={txnForm.reference} onChange={e => setTxnForm({ ...txnForm, reference: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTxnOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={txnMutation.isPending}>Record Transaction</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
