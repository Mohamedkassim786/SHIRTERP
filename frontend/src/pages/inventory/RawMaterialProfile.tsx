import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { ArrowLeft, Package, MapPin, AlertTriangle, ArrowDownUp, Barcode } from 'lucide-react';
import api from '@/api/axios';

export default function RawMaterialProfile() {
  const { id } = useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['material-history', id],
    queryFn: async () => (await api.get(`/masters/raw-materials/${id}/history`)).data,
    retry: 1
  });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading material ledger...</div>;
  if (!profile) return <div className="p-8 text-center text-red-500">Material not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/inventory">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm hover:bg-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Ledger</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <Card className="glass md:col-span-2 border-l-4 border-l-indigo-500">
          <CardHeader className="pb-3 border-b border-slate-200">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              {profile.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Storage Location</p>
                  <p className="text-sm font-medium text-white mt-0.5">{profile.location || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Min Stock Alert</p>
                  <p className="text-sm font-medium text-white mt-0.5">{profile.minStockLevel} {profile.unit?.shortName}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Status Card */}
        <Card className={`glass border-l-4 ${profile.currentStock <= profile.minStockLevel ? 'border-l-red-500 bg-red-50' : 'border-l-green-500 bg-green-50'}`}>
          <CardHeader className="pb-3 border-b border-white/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownUp className={`h-5 w-5 ${profile.currentStock <= profile.minStockLevel ? 'text-red-600' : 'text-green-600'}`} />
              Current Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div>
              <p className={`text-3xl font-bold ${profile.currentStock <= profile.minStockLevel ? 'text-red-700' : 'text-green-700'}`}>
                {profile.currentStock} <span className="text-lg font-medium">{profile.unit?.shortName}</span>
              </p>
              {profile.currentStock <= profile.minStockLevel && (
                <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Stock is below minimum level</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <h3 className="text-lg font-bold text-slate-700 mb-4">Transaction History</h3>
        <DataTable 
          columns={[
            { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleString('en-IN') },
            { key: 'type', label: 'In / Out', render: (r: any) => (
              <Badge variant={r.type === 'IN' ? 'default' : 'destructive'} className={r.type === 'IN' ? 'bg-green-600' : ''}>
                {r.type}
              </Badge>
            )},
            { key: 'quantity', label: 'Quantity', render: (r: any) => (
              <span className={`font-bold ${r.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                {r.type === 'IN' ? '+' : '-'}{r.quantity} {profile.unit?.shortName}
              </span>
            )},
            { key: 'reference', label: 'Reference' },
            { key: 'batchNumber', label: 'Batch / Barcode', render: (r: any) => (
              r.batchNumber ? (
                <span className="flex items-center text-xs font-mono bg-white px-2 py-1 rounded">
                  <Barcode className="h-3 w-3 mr-1" /> {r.batchNumber}
                </span>
              ) : '-'
            )},
            { key: 'notes', label: 'Notes' }
          ]} 
          data={profile.history || []} 
          searchKey="reference" 
        />
      </div>
    </div>
  );
}
