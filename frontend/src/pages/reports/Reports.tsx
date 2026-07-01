import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { TrendingUp, TrendingDown, IndianRupee, FileBarChart, Printer } from 'lucide-react';
import api from '@/api/axios';

type ReportType = 'pl' | 'sales' | 'purchase' | 'stock' | 'gst' | 'outstanding' | 'customer';

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('pl');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);


  const { data, isLoading, refetch } = useQuery({
    queryKey: ['full-report', reportType, dateFrom, dateTo],
    queryFn: async () => (await api.get(`/full-reports?type=${reportType}&from=${dateFrom}&to=${dateTo}`)).data,
    retry: 1
  });


  const tabs: { key: ReportType; label: string }[] = [
    { key: 'pl',          label: '📊 P&L Report' },
    { key: 'sales',       label: '🛒 Sales Report' },
    { key: 'purchase',    label: '📦 Purchase Report' },
    { key: 'stock',       label: '📋 Stock Report' },
    { key: 'gst',         label: '🧾 GST Report' },
    { key: 'outstanding', label: '💰 Outstanding' },
    { key: 'customer',    label: '👥 Customer Report' },
  ];

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Print / Export</Button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setReportType(t.key)}
            className={`px-3 py-1.5 rounded-lg font-medium text-sm ${reportType === t.key ? 'bg-primary text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-slate-50/50 rounded-lg">
        <div><Label className="text-xs">From Date</Label><Input type="date" className="w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To Date</Label><Input type="date" className="w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button onClick={() => refetch()} size="sm"><FileBarChart className="h-4 w-4 mr-1" />Generate</Button>
      </div>


      {isLoading && <div className="text-center py-12 text-slate-500">Generating report...</div>}

      {/* P&L Report */}
      {!isLoading && reportType === 'pl' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: data.revenue, color: 'text-green-600', icon: TrendingUp },
              { label: 'Material Cost (Purchases)', value: data.purchases, color: 'text-orange-600', icon: TrendingDown },
              { label: 'Gross Profit', value: data.grossProfit, color: data.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600', icon: IndianRupee },
              { label: 'Total Expenses', value: data.expenses, color: 'text-red-600', icon: TrendingDown },
              { label: 'Net Profit / Loss', value: data.netProfit, color: data.netProfit >= 0 ? 'text-green-600' : 'text-red-600', icon: data.netProfit >= 0 ? TrendingUp : TrendingDown },
            ].map(item => (
              <Card key={item.label} className={`border-l-4 ${item.color.replace('text-', 'border-l-')}`}>
                <CardHeader className="pb-1 flex flex-row items-center justify-between"><CardTitle className="text-xs text-slate-400">{item.label}</CardTitle><item.icon className={`h-4 w-4 ${item.color}`} /></CardHeader>
                <CardContent><div className={`text-xl font-bold ${item.color}`}>₹{item.value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sales Report */}
      {!isLoading && reportType === 'sales' && data && (
        <div className="space-y-4">
          <Card><CardContent className="p-4 flex justify-between items-center"><span className="font-medium">Total Sales (Period)</span><span className="text-xl font-bold text-green-600">₹{data.total?.toLocaleString('en-IN')}</span></CardContent></Card>
          <DataTable columns={[
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
            { key: 'customer', label: 'Customer', render: (r: any) => r.customer?.name },
            { key: 'subTotal', label: 'Sub Total', render: (r: any) => `₹${r.subTotal?.toLocaleString('en-IN')}` },
            { key: 'gstAmount', label: 'GST', render: (r: any) => `₹${r.gstAmount?.toLocaleString('en-IN')}` },
            { key: 'totalAmount', label: 'Total', render: (r: any) => <span className="font-bold">₹{r.totalAmount?.toLocaleString('en-IN')}</span> },
            { key: 'status', label: 'Status', render: (r: any) => <Badge variant={r.status === 'PAID' ? 'default' : 'secondary'}>{r.status}</Badge> },
          ]} data={data.invoices || []} searchKey="invoiceNumber" />
        </div>
      )}

      {/* Purchase Report */}
      {!isLoading && reportType === 'purchase' && data && (
        <div className="space-y-4">
          <Card><CardContent className="p-4 flex justify-between items-center"><span className="font-medium">Total Purchases (Period)</span><span className="text-xl font-bold text-orange-600">₹{data.total?.toLocaleString('en-IN')}</span></CardContent></Card>
          <DataTable columns={[
            { key: 'poNumber', label: 'PO #' },
            { key: 'createdAt', label: 'Date', render: (r: any) => new Date(r.createdAt).toLocaleDateString('en-IN') },
            { key: 'supplier', label: 'Supplier', render: (r: any) => r.supplier?.name },
            { key: 'items', label: 'Materials', render: (r: any) => `${r.items?.length} items` },
            { key: 'totalAmount', label: 'Total', render: (r: any) => <span className="font-bold">₹{r.totalAmount?.toLocaleString('en-IN')}</span> },
            { key: 'status', label: 'Status', render: (r: any) => <Badge variant={r.status === 'COMPLETED' ? 'default' : 'secondary'}>{r.status}</Badge> },
          ]} data={data.orders || []} searchKey="poNumber" />
        </div>
      )}

      {/* Stock Report */}
      {!isLoading && reportType === 'stock' && data && (
        <div className="space-y-4">
          {data.lowStockCount > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">⚠ {data.lowStockCount} materials are below minimum stock level</div>}
          <h3 className="font-semibold">Raw Materials</h3>
          <DataTable columns={[
            { key: 'name', label: 'Material' },
            { key: 'unit', label: 'Unit', render: (r: any) => r.unit?.shortName },
            { key: 'currentStock', label: 'Current Stock', render: (r: any) => <span className={r.currentStock <= r.minStockLevel ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{r.currentStock}</span> },
            { key: 'minStockLevel', label: 'Min Level' },
          ]} data={data.materials || []} searchKey="name" />
          <h3 className="font-semibold mt-4">Finished Goods</h3>
          <DataTable columns={[
            { key: 'model', label: 'Model', render: (r: any) => r.model?.name },
            { key: 'color', label: 'Color', render: (r: any) => r.color?.name },
            { key: 'size', label: 'Size', render: (r: any) => r.size?.name },
            { key: 'quantity', label: 'Quantity', render: (r: any) => <span className="font-bold">{r.quantity} pcs</span> },
          ]} data={data.finished || []} searchKey="quantity" />
        </div>
      )}

      {/* GST Report */}
      {!isLoading && reportType === 'gst' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">Output GST (Collected)</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-green-600">₹{data.outputGst?.toFixed(2)}</div></CardContent></Card>
            <Card className="border-l-4 border-l-orange-500"><CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">Input GST (Paid on Purchases)</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-orange-600">₹{data.inputGst?.toFixed(2)}</div></CardContent></Card>
            <Card className="border-l-4 border-l-primary"><CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">Net GST Payable</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-primary">₹{data.netGst?.toFixed(2)}</div></CardContent></Card>
          </div>
          <DataTable columns={[
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
            { key: 'customer', label: 'Customer', render: (r: any) => r.customer?.name },
            { key: 'subTotal', label: 'Taxable Value', render: (r: any) => `₹${r.subTotal?.toFixed(2)}` },
            { key: 'gstAmount', label: 'GST Amount', render: (r: any) => `₹${r.gstAmount?.toFixed(2)}` },
            { key: 'totalAmount', label: 'Invoice Total', render: (r: any) => `₹${r.totalAmount?.toFixed(2)}` },
          ]} data={data.invoices || []} searchKey="invoiceNumber" />
        </div>
      )}

      {/* Outstanding Report */}
      {!isLoading && reportType === 'outstanding' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-red-500"><CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">Customer Outstanding</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-red-600">₹{data.totalCustomerOutstanding?.toLocaleString('en-IN')}</div></CardContent></Card>
            <Card className="border-l-4 border-l-orange-500"><CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">Vendor Outstanding</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-orange-600">₹{data.totalSupplierOutstanding?.toLocaleString('en-IN')}</div></CardContent></Card>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Customer Dues</h3>
            <DataTable columns={[
              { key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' },
              { key: 'outstandingBalance', label: 'Outstanding', render: (r: any) => <span className="font-bold text-red-600">₹{r.outstandingBalance?.toLocaleString('en-IN')}</span> },
            ]} data={data.customers || []} searchKey="name" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Vendor Dues</h3>
            <DataTable columns={[
              { key: 'name', label: 'Supplier' }, { key: 'phone', label: 'Phone' },
              { key: 'outstandingBalance', label: 'Outstanding', render: (r: any) => <span className="font-bold text-orange-600">₹{r.outstandingBalance?.toLocaleString('en-IN')}</span> },
            ]} data={data.suppliers || []} searchKey="name" />
          </div>
        </div>
      )}

      {/* Customer Report */}
      {!isLoading && reportType === 'customer' && data && (
        <DataTable columns={[
          { key: 'name', label: 'Customer Name' },
          { key: 'phone', label: 'Phone' },
          { key: '_count', label: 'Orders', render: (r: any) => r._count?.orders },
          { key: 'totalRevenue', label: 'Total Revenue', render: (r: any) => <span className="font-bold text-green-600">₹{r.totalRevenue?.toLocaleString('en-IN')}</span> },
          { key: 'outstandingBalance', label: 'Outstanding', render: (r: any) => <span className={r.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}>₹{r.outstandingBalance?.toLocaleString('en-IN')}</span> },
        ]} data={data || []} searchKey="name" />
      )}

    </div>
  );
}
