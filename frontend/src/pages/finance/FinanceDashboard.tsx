import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {  Landmark, IndianRupee, FileText, Activity  } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

type Tab = 'overview' | 'daybook' | 'accounts';

export default function FinanceDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  
  // Modals
  const [isTxnOpen, setIsTxnOpen] = useState(false);
  const [isAccOpen, setIsAccOpen] = useState(false);
  
  // Forms
  const [accForm, setAccForm] = useState({ name: '', type: 'ASSET' });
  const [txnForm, setTxnForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', description: '', reference: '', debitAccountId: '', creditAccountId: '' });

  // Data fetching
  const { data: dashboard } = useQuery({ queryKey: ['finance-dashboard'], queryFn: async () => (await api.get('/finance/dashboard')).data, retry: 1 });
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
        <h1 className="text-2xl font-bold text-slate-900">{t('finance.title', 'Accounts & Finance')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsTxnOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800">
            <Activity className="h-4 w-4 mr-1" /> {t('finance.newTxn', 'New Transaction')}
          </Button>
          <Button variant="outline" onClick={() => setIsAccOpen(true)}>
            <Landmark className="h-4 w-4 mr-1" /> {t('finance.newAcc', 'New Account')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(['overview', 'daybook', 'accounts'] as Tab[]).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === tabKey ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
          >
            {tabKey === 'overview' && <IndianRupee className="h-4 w-4 inline mr-1.5" />}
            {tabKey === 'daybook' && <FileText className="h-4 w-4 inline mr-1.5" />}
            {tabKey === 'accounts' && <Landmark className="h-4 w-4 inline mr-1.5" />}
            {t(`finance.tabs.${tabKey}`, tabKey.charAt(0).toUpperCase() + tabKey.slice(1))}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass border-l-4 border-l-green-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">{t('finance.kpi.revenue', 'Total Revenue')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{dashboard?.totalRevenue?.toLocaleString('en-IN') || 0}</p>
              </CardContent>
            </Card>
            <Card className="glass border-l-4 border-l-red-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">{t('finance.kpi.expenses', 'Total Expenses')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{dashboard?.totalExpense?.toLocaleString('en-IN') || 0}</p>
              </CardContent>
            </Card>
            <Card className="glass border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">{t('finance.kpi.profit', 'Net Profit')}</p>
                <p className={`text-2xl font-bold mt-1 ${dashboard?.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{dashboard?.netProfit?.toLocaleString('en-IN') || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-l-4 border-l-indigo-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">{t('finance.kpi.assets', 'Total Assets (Cash/Bank)')}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{dashboard?.totalAssets?.toLocaleString('en-IN') || 0}</p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="glass">
            <CardHeader><CardTitle>{t('finance.balanceSheet', 'Balance Sheet Summary')}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg text-slate-700 border-b pb-2 mb-4">{t('finance.assets', 'Assets')}</h3>
                  {accounts.filter((a: any) => a.type === 'ASSET').map((a: any) => (
                    <div key={a.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600">{a.name}</span>
                      <span className="font-medium">₹{a.balance.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 mt-2 border-t-2 font-bold text-slate-900">
                    <span>{t('finance.totalAssets', 'Total Assets')}</span>
                    <span>₹{dashboard?.totalAssets?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-700 border-b pb-2 mb-4">{t('finance.liabilities', 'Liabilities & Equity')}</h3>
                  {accounts.filter((a: any) => a.type === 'LIABILITY' || a.type === 'EQUITY').map((a: any) => (
                    <div key={a.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600">{a.name}</span>
                      <span className="font-medium">₹{a.balance.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 mt-2 border-t-2 font-bold text-slate-900">
                    <span>{t('finance.totalLiabilities', 'Total Liabilities')}</span>
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
            { key: 'name', label: t('finance.cols.accName', 'Account Name'), render: (r: any) => <span className="font-medium">{r.name}</span> },
            { key: 'type', label: t('finance.cols.type', 'Type'), render: (r: any) => <Badge variant="outline">{r.type}</Badge> },
            { key: 'balance', label: t('finance.cols.balance', 'Current Balance'), render: (r: any) => (
              <span className={`font-bold ${(r.type === 'ASSET' || r.type === 'REVENUE') ? 'text-green-600' : (r.type === 'EXPENSE' || r.type === 'LIABILITY') ? 'text-red-600' : 'text-slate-700'}`}>
                ₹{r.balance.toLocaleString('en-IN')}
              </span>
            )},
            { key: 'isSystem', label: t('finance.cols.system', 'System'), render: (r: any) => r.isSystem ? <Badge>{t('finance.system', 'System')}</Badge> : <span className="text-xs text-slate-400">{t('finance.custom', 'Custom')}</span> }
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
            { key: 'date', label: t('customers.cols.date', 'Date'), render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
            { key: 'description', label: t('finance.cols.desc', 'Description'), render: (r: any) => (
              <div>
                <p className="font-medium text-slate-900">{r.description}</p>
                {r.reference && <p className="text-xs text-slate-500">Ref: {r.reference}</p>}
              </div>
            )},
            { key: 'debit', label: t('finance.cols.debit', 'Debit Account (In)'), render: (r: any) => <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">{r.debitAccount?.name}</Badge> },
            { key: 'credit', label: t('finance.cols.credit', 'Credit Account (Out)'), render: (r: any) => <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">{r.creditAccount?.name}</Badge> },
            { key: 'amount', label: t('finance.cols.amount', 'Amount'), render: (r: any) => <span className="font-bold text-slate-900">₹{r.amount.toLocaleString('en-IN')}</span> }
          ]}
          data={transactions}
          searchKey="description"
          isLoading={txnLoading}
        />
      )}

      {/* Create Account Modal */}
      <Dialog open={isAccOpen} onOpenChange={setIsAccOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.accForm.title', 'Create Ledger Account')}</DialogTitle></DialogHeader>
          <form onSubmit={handleAccSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('finance.accForm.name', 'Account Name *')}</Label>
              <AnimatedInput required placeholder={t('finance.accForm.namePh', 'e.g. SBI Checking, Rent Expense')} value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.accForm.type', 'Account Type *')}</Label>
              <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={accForm.type} onChange={e => setAccForm({ ...accForm, type: e.target.value })}>
                <option value="ASSET">{t('finance.accForm.asset', 'Asset (Bank, Cash, Inventory)')}</option>
                <option value="LIABILITY">{t('finance.accForm.liability', 'Liability (Loans, Payables)')}</option>
                <option value="EQUITY">{t('finance.accForm.equity', 'Equity (Capital)')}</option>
                <option value="REVENUE">{t('finance.accForm.revenue', 'Revenue (Sales, Income)')}</option>
                <option value="EXPENSE">{t('finance.accForm.expense', 'Expense (Rent, Salaries, COGS)')}</option>
              </AnimatedSelect>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAccOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={accMutation.isPending}>{t('finance.accForm.create', 'Create Account')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Transaction Modal */}
      <Dialog open={isTxnOpen} onOpenChange={setIsTxnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('finance.txnForm.title', 'New Journal Transaction')}</DialogTitle></DialogHeader>
          <form onSubmit={handleTxnSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('finance.txnForm.date', 'Date *')}</Label>
                <AnimatedInput type="date" required value={txnForm.date} onChange={e => setTxnForm({ ...txnForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('finance.txnForm.amount', 'Amount (₹) *')}</Label>
                <AnimatedInput type="number" required min="1" value={txnForm.amount} onChange={e => setTxnForm({ ...txnForm, amount: e.target.value })} />
              </div>
            </div>
            
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="space-y-2">
                <Label className="text-green-600">{t('finance.txnForm.debit', 'Debit (Money received by) *')}</Label>
                <AnimatedSelect required className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={txnForm.debitAccountId} onChange={e => setTxnForm({ ...txnForm, debitAccountId: e.target.value })}>
                  <option value="">{t('finance.txnForm.selectAcc', 'Select Account')}</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </AnimatedSelect>
              </div>
              <div className="space-y-2">
                <Label className="text-red-600">{t('finance.txnForm.credit', 'Credit (Money given by) *')}</Label>
                <AnimatedSelect required className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={txnForm.creditAccountId} onChange={e => setTxnForm({ ...txnForm, creditAccountId: e.target.value })}>
                  <option value="">{t('finance.txnForm.selectAcc', 'Select Account')}</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </AnimatedSelect>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('finance.txnForm.desc', 'Description *')}</Label>
              <AnimatedInput required placeholder={t('finance.txnForm.descPh', 'e.g. Paid office rent')} value={txnForm.description} onChange={e => setTxnForm({ ...txnForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.txnForm.ref', 'Reference No (Optional)')}</Label>
              <AnimatedInput placeholder={t('finance.txnForm.refPh', 'Invoice / Cheque No')} value={txnForm.reference} onChange={e => setTxnForm({ ...txnForm, reference: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTxnOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={txnMutation.isPending}>{t('finance.txnForm.record', 'Record Transaction')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
