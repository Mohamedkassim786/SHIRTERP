import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, TrendingDown, PlusCircle, Trash2 } from 'lucide-react';
import api from '@/api/axios';

const PAYMENT_METHODS = ['CASH', 'BANK', 'UPI', 'CHEQUE'];

export default function Expenses() {
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
    { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
    { key: 'category', label: 'Category', render: (r: any) => <Badge variant="outline">{r.category?.name}</Badge> },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount', render: (r: any) => <span className="font-semibold text-red-600">₹{r.amount.toLocaleString('en-IN')}</span> },
    { key: 'paidBy', label: 'Paid By', render: (r: any) => <Badge variant="secondary">{r.paidBy}</Badge> },
    { key: 'actions', label: '', render: (r: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Expense Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm text-slate-400">This Month</CardTitle><IndianRupee className="h-4 w-4 text-red-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">₹{(summary?.totalThisMonth || 0).toLocaleString('en-IN')}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm text-slate-400">Filtered Total</CardTitle><TrendingDown className="h-4 w-4 text-orange-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">₹{totalExpenses.toLocaleString('en-IN')}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Top Category (Month)</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-bold">{summary?.byCategory?.[0]?.categoryName || '-'}</div><div className="text-sm text-slate-400">₹{summary?.byCategory?.[0]?.total?.toLocaleString('en-IN') || 0}</div></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['expenses', 'categories'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-t-lg font-medium text-sm capitalize ${activeTab === tab ? 'bg-primary text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-200'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Date Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">From</Label><Input type="date" className="w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
            <div><Label className="text-xs">To</Label><Input type="date" className="w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            {(dateFrom || dateTo) && <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear Filter</Button>}
          </div>
          <DataTable columns={columns} data={expenses} searchKey="description" onAdd={openAdd} />
        </div>
      )}

      {activeTab === 'categories' && (
        <Card>
          <CardHeader><CardTitle>Expense Categories</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="New category name..." value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCategory.trim()) catMutation.mutate(newCategory.trim()); }} />
              <Button onClick={() => { if (newCategory.trim()) catMutation.mutate(newCategory.trim()); }} disabled={catMutation.isPending}><PlusCircle className="h-4 w-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg">
                  <div>
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-slate-500 ml-2">({cat._count?.expenses || 0} expenses)</span>
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
          <DialogHeader><DialogTitle>{editItem ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, categoryId: Number(form.categoryId), amount: Number(form.amount) }); }} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Select</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Monthly rent payment" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.paidBy} onChange={e => setForm({ ...form, paidBy: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference / Voucher No.</Label>
              <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
