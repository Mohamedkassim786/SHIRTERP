import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import api from '@/api/axios';

export default function ShirtModels() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', categoryId: '', hsnCode: '' });
  const [bomItems, setBomItems] = useState([{ materialId: '', quantityPerUnit: '' }]);

  const { data: models = [] } = useQuery({ queryKey: ['shirt-models'], queryFn: async () => (await api.get('/masters/shirt-models')).data, retry: 1 });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get('/masters/categories')).data, retry: 1 });
  const { data: materials = [] } = useQuery({ queryKey: ['raw-materials'], queryFn: async () => (await api.get('/masters/raw-materials')).data, retry: 1 });

  const mutation = useMutation({
    mutationFn: async (data: any) => api.post('/masters/shirt-models', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shirt-models'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error saving shirt model')
  });

  const resetForm = () => {
    setFormData({ name: '', categoryId: '', hsnCode: '' });
    setBomItems([{ materialId: '', quantityPerUnit: '' }]);
  };

  const addBomRow = () => setBomItems([...bomItems, { materialId: '', quantityPerUnit: '' }]);
  const removeBomRow = (idx: number) => setBomItems(bomItems.filter((_, i) => i !== idx));
  const updateBomRow = (idx: number, field: string, value: string) => {
    const n = [...bomItems]; (n[idx] as any)[field] = value; setBomItems(n);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      categoryId: Number(formData.categoryId),
      boms: bomItems.filter(b => b.materialId && b.quantityPerUnit).map(b => ({
        materialId: Number(b.materialId),
        quantityPerUnit: Number(b.quantityPerUnit)
      }))
    });
  };

  const columns = [
    { key: 'name', label: 'Model Name' },
    { key: 'category', label: 'Category', render: (row: any) => row.category?.name || '-' },
    { key: 'hsnCode', label: 'HSN Code' },
    { key: 'boms', label: 'BOM Items', render: (row: any) => `${row.boms?.length || 0} materials` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Shirt Models & BOM</h1>
      <DataTable columns={columns} data={models} searchKey="name" onAdd={() => { resetForm(); setIsDialogOpen(true); }} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Shirt Model</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model Name *</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                  <option value="">Select Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} placeholder="e.g. 6205" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Bill of Materials (BOM)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addBomRow}><Plus className="h-4 w-4 mr-1" />Add Material</Button>
              </div>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-2 text-left">Raw Material</th>
                      <th className="p-2 text-left">Qty per Unit</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomItems.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <select className="w-full rounded border border-input px-2 py-1 text-sm" value={item.materialId} onChange={e => updateBomRow(idx, 'materialId', e.target.value)}>
                            <option value="">Select Material</option>
                            {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.unit?.shortName})</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <Input type="number" min="0.001" step="0.001" className="w-32" value={item.quantityPerUnit} onChange={e => updateBomRow(idx, 'quantityPerUnit', e.target.value)} placeholder="e.g. 1.5" />
                        </td>
                        <td className="p-2">
                          {bomItems.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeBomRow(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save Model'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
