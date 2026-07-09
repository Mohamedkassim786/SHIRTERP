import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { AnimatedDatePicker } from '@/components/ui/AnimatedDatePicker';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {  IndianRupee, TrendingDown, PlusCircle, Trash2, CreditCard  } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

const PAYMENT_METHODS = ['CASH', 'BANK', 'UPI', 'CHEQUE'];

export default function Expenses() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [newCategory, setNewCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [form, setForm] = useState({ categoryId: '', amount: '', description: '', paidBy: 'CASH', reference: '', date: new Date().toISOString().split('T')[0] });

  const params = new URLSearchParams();
  if (dateFrom) params.set('from', dateFrom);
  if (dateTo) params.set('to', dateTo);

  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', dateFrom, dateTo], queryFn: async () => (await api.get(`/expenses?${params}`)).data, retry: 1 });
  const { data: categories = [] } = useQuery({ queryKey: ['expense-categories'], queryFn: async () => (await api.get('/expenses/categories')).data, retry: 1 });
  const { data: summary } = useQuery({ queryKey: ['expense-summary'], queryFn: async () => (await api.get('/expenses/summary')).data, retry: 1 });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => editItem ? api.put(`/expenses/${editItem.id}`, data) : api.post('/expenses', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); queryClient.invalidateQueries({ queryKey: ['expense-summary'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); setIsOpen(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); queryClient.invalidateQueries({ queryKey: ['expense-summary'] }); }
  });

  const catMutation = useMutation({
    mutationFn: (name: string) => api.post('/expenses/categories', { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expense-categories'] }); setNewCategory(''); }
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ categoryId: String(item.categoryId), amount: String(item.amount), description: item.description, paidBy: item.paidBy, reference: item.reference || '', date: item.date?.split('T')[0] || '' });
    setIsOpen(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ categoryId: '', amount: '', description: '', paidBy: 'CASH', reference: '', date: new Date().toISOString().split('T')[0] });
    setIsOpen(true);
  };

  const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  const columns = [
    { key: 'date', label: t('customers.cols.date', 'Date'), render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
    { key: 'category', label: t('expenses.cols.category', 'CATEGORY'), render: (r: any) => <Badge variant="outline">{r.category?.name}</Badge> },
    { key: 'description', label: t('expenses.cols.description', 'DESCRIPTION') },
    { key: 'amount', label: t('expenses.cols.amount', 'AMOUNT'), render: (r: any) => <span className="font-semibold text-red-600">₹{r.amount.toLocaleString('en-IN')}</span> },
    { key: 'paidBy', label: t('expenses.cols.paidBy', 'PAID BY'), render: (r: any) => <Badge variant="secondary">{r.paidBy}</Badge> },
    { key: 'actions', label: '', render: (r: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>{t('common.edit', 'Edit')}</Button>
        <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-200/50">
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('expenses.title', 'Expense Management')}</h1>
          <p className="text-sm text-slate-500">Track company expenditures, categories, and payment methods</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm text-slate-400">{t('expenses.kpi.thisMonth', 'This Month')}</CardTitle><IndianRupee className="h-4 w-4 text-red-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">₹{(summary?.totalThisMonth || 0).toLocaleString('en-IN')}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm text-slate-400">{t('expenses.kpi.filteredTotal', 'Filtered Total')}</CardTitle><TrendingDown className="h-4 w-4 text-orange-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">₹{totalExpenses.toLocaleString('en-IN')}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">{t('expenses.kpi.topCategory', 'Top Category (Month)')}</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-bold">{summary?.byCategory?.[0]?.categoryName || '-'}</div><div className="text-sm text-slate-400">₹{summary?.byCategory?.[0]?.total?.toLocaleString('en-IN') || 0}</div></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['expenses', 'categories'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-t-lg font-medium text-sm capitalize ${activeTab === tab ? 'bg-primary text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-200'}`}>{t(`expenses.tabs.${tab}`, tab)}</button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Date Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">{t('expenses.filter.from', 'From')}</Label><AnimatedDatePicker className="w-36 font-normal" placeholder="Start Date" value={dateFrom} onChange={setDateFrom} /></div>
            <div><Label className="text-xs">{t('expenses.filter.to', 'To')}</Label><AnimatedDatePicker className="w-36 font-normal" placeholder="End Date" value={dateTo} onChange={setDateTo} /></div>
            {(dateFrom || dateTo) && <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>{t('expenses.filter.clear', 'Clear Filter')}</Button>}
          </div>
          <DataTable columns={columns} data={expenses} searchKey="description" onAdd={openAdd} />
        </div>
      )}

      {activeTab === 'categories' && (
        <Card>
          <CardHeader><CardTitle>{t('expenses.categoriesTitle', 'Expense Categories')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <AnimatedInput placeholder={t('expenses.newCategory', 'New category name...')} value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCategory.trim()) catMutation.mutate(newCategory.trim()); }} />
              <Button onClick={() => { if (newCategory.trim()) catMutation.mutate(newCategory.trim()); }} disabled={catMutation.isPending}><PlusCircle className="h-4 w-4 mr-1" />{t('common.add', 'Add')}</Button>
            </div>
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg">
                  <div>
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-slate-500 ml-2">({cat._count?.expenses || 0} {t('expenses.expensesCount', 'expenses')})</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteCatMutation.mutate(cat.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? t('expenses.form.editTitle', 'Edit Expense') : t('expenses.form.addTitle', 'Add Expense')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, categoryId: Number(form.categoryId), amount: Number(form.amount) }); }} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('expenses.form.category', 'Category *')}</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">{t('common.select', 'Select')}</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AnimatedSelect>
              </div>
              <div className="space-y-2">
                <Label>{t('expenses.form.date', 'Date *')}</Label>
                <AnimatedDatePicker value={form.date} onChange={val => setForm({ ...form, date: val })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('expenses.form.desc', 'Description *')}</Label>
              <AnimatedInput required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('expenses.form.descPh', 'e.g. Monthly rent payment')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('expenses.form.amount', 'Amount (₹) *')}</Label>
                <AnimatedInput type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('expenses.form.paymentMethod', 'Payment Method')}</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={form.paidBy} onChange={e => setForm({ ...form, paidBy: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </AnimatedSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('expenses.form.reference', 'Reference / Voucher No.')}</Label>
              <AnimatedInput value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder={t('common.optionalPlaceholder', 'Optional')} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
