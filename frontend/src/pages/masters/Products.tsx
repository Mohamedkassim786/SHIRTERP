import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Box, Grid, Palette, Ruler } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

type MasterTab = 'products' | 'categories' | 'colors' | 'sizes';

function ProductsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', categoryId: '', hsnCode: '' });
  const [bomItems, setBomItems] = useState([{ materialId: '', quantityPerUnit: '' }]);

  const { data: models = [] } = useQuery({ queryKey: ['products'], queryFn: async () => (await api.get('/masters/products')).data, retry: 1 });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get('/masters/categories')).data, retry: 1 });
  const { data: materials = [] } = useQuery({ queryKey: ['raw-materials'], queryFn: async () => (await api.get('/masters/raw-materials')).data, retry: 1 });

  const mutation = useMutation({
    mutationFn: async (data: any) => api.post('/masters/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => alert(e.response?.data?.message || 'Error saving product')
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
    { key: 'name', label: t('masters.products.productName', 'Product Name') },
    { key: 'category', label: t('masters.products.category', 'Category'), render: (row: any) => row.category?.name || '-' },
    { key: 'hsnCode', label: t('masters.products.hsnCode', 'HSN Code') },
    { key: 'boms', label: t('masters.products.bomItems', 'BOM Items'), render: (row: any) => `${row.boms?.length || 0} materials` },
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={models} searchKey="name" onAdd={() => { resetForm(); setIsDialogOpen(true); }} addLabel={t('masters.products.addNew', 'Add New Product')} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('masters.products.addNew', 'Add New Product')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('masters.products.productName', 'Product Name')} *</Label>
                <AnimatedInput required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('masters.products.category', 'Category')} *</Label>
                <AnimatedSelect className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                  <option value="">Select Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AnimatedSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('masters.products.hsnCode', 'HSN Code')}</Label>
              <AnimatedInput value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} placeholder="e.g. 6205" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">{t('masters.products.bomItems', 'Bill of Materials (BOM)')}</Label>
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
                          <AnimatedSelect className="w-full rounded border border-input px-2 py-1 text-sm" value={item.materialId} onChange={e => updateBomRow(idx, 'materialId', e.target.value)}>
                            <option value="">Select Material</option>
                            {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.unit?.shortName})</option>)}
                          </AnimatedSelect>
                        </td>
                        <td className="p-2">
                          <AnimatedInput type="number" min="0.001" step="0.001" className="w-32" value={item.quantityPerUnit} onChange={e => updateBomRow(idx, 'quantityPerUnit', e.target.value)} placeholder="e.g. 1.5" />
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SimpleMasterCrud({ endpoint, queryKey, columns, title, addLabel, formFields }: any) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data = [] } = useQuery({ queryKey: [queryKey], queryFn: async () => (await api.get(endpoint)).data, retry: 1 });

  const mutation = useMutation({
    mutationFn: async (data: any) => api.post(endpoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setIsDialogOpen(false);
      setFormData({});
    },
    onError: (e: any) => alert(e.response?.data?.message || `Error saving ${title}`)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={data} searchKey="name" onAdd={() => { setFormData({}); setIsDialogOpen(true); }} addLabel={addLabel} />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{addLabel}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formFields.map((f: any) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label} *</Label>
                <AnimatedInput required value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} placeholder={f.placeholder} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Products() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MasterTab>('products');

  const tabs: { key: MasterTab; label: string; icon: any }[] = [
    { key: 'products', label: t('masters.products.tabs.products', 'Products'), icon: Box },
    { key: 'categories', label: t('masters.products.tabs.categories', 'Categories'), icon: Grid },
    { key: 'colors', label: t('masters.products.tabs.colors', 'Colours'), icon: Palette },
    { key: 'sizes', label: t('masters.products.tabs.sizes', 'Sizes'), icon: Ruler },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
          <Box className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('masters.products.title', 'Products & Master Data')}</h1>
          <p className="text-sm text-slate-500">Manage products, size variants, color listings, and categories</p>
        </div>
      </div>

      <div className="flex space-x-1 rounded-xl bg-slate-100 p-1 w-full max-w-2xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium transition-all ${
                isActive ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 min-h-[500px]">
        {activeTab === 'products' && <ProductsTab />}
        
        {activeTab === 'categories' && (
          <SimpleMasterCrud
            endpoint="/masters/categories"
            queryKey="categories"
            title="Category"
            addLabel={t('masters.products.addCategory', 'Add New Category')}
            columns={[
              { key: 'name', label: t('masters.products.category', 'Category') },
              { key: 'description', label: t('masters.products.desc', 'Description') }
            ]}
            formFields={[
              { key: 'name', label: t('masters.products.category', 'Category') },
              { key: 'description', label: t('masters.products.desc', 'Description'), placeholder: 'Optional' }
            ]}
          />
        )}

        {activeTab === 'colors' && (
          <SimpleMasterCrud
            endpoint="/masters/colors"
            queryKey="colors"
            title="Colour"
            addLabel={t('masters.products.addColor', 'Add New Colour')}
            columns={[
              { key: 'name', label: t('masters.products.colorName', 'Colour Name') }
            ]}
            formFields={[
              { key: 'name', label: t('masters.products.colorName', 'Colour Name') }
            ]}
          />
        )}

        {activeTab === 'sizes' && (
          <SimpleMasterCrud
            endpoint="/masters/sizes"
            queryKey="sizes"
            title="Size"
            addLabel={t('masters.products.addSize', 'Add New Size')}
            columns={[
              { key: 'name', label: t('masters.products.sizeName', 'Size Name') }
            ]}
            formFields={[
              { key: 'name', label: t('masters.products.sizeName', 'Size Name') }
            ]}
          />
        )}
      </div>
    </div>
  );
}
