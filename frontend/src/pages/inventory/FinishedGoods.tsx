import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/shared/DataTable';
import api from '@/api/axios';
import { PackageCheck } from 'lucide-react';

export default function FinishedGoods() {
  const { t } = useTranslation();

  const { data: finishedGoods = [], isLoading } = useQuery({
    queryKey: ['finished-goods'],
    queryFn: async () => {
      try {
        const res = await api.get('/production/finished-goods');
        return res.data;
      } catch(e) { return []; }
    }
  });

  const columns = [
    { key: 'model', label: 'Shirt Model', render: (row: any) => row.model?.name || '-' },
    { key: 'color', label: 'Color', render: (row: any) => (
      <div className="flex items-center gap-2">
        {row.color?.hexCode && (
          <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: row.color.hexCode }} />
        )}
        <span>{row.color?.name || '-'}</span>
      </div>
    )},
    { key: 'size', label: 'Size', render: (row: any) => row.size?.name || '-' },
    { key: 'quantity', label: 'Available Stock', render: (row: any) => <span className="text-lg font-bold text-green-600">{row.quantity} pcs</span> },
    { key: 'location', label: 'Warehouse Location', render: (row: any) => row.location || 'Main Warehouse' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-green-600" /> Finished Goods Inventory
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track completed products ready for dispatch.</p>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={finishedGoods} 
        searchKey="model.name" 
      />
    </div>
  );
}
