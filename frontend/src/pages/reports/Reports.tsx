import { AnimatedDatePicker } from '@/components/ui/AnimatedDatePicker';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { 
  TrendingUp, TrendingDown, IndianRupee, FileBarChart, Printer,
  ShoppingCart, Package, ClipboardList, Receipt, Coins, Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';
import { format } from 'date-fns';

type ReportType = 'pl' | 'sales' | 'purchase' | 'stock' | 'gst' | 'outstanding' | 'customer';

export default function Reports() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType>('pl');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);


  const { data, isLoading, refetch } = useQuery({
    queryKey: ['full-report', reportType, dateFrom, dateTo],
    queryFn: async () => (await api.get(`/full-reports?type=${reportType}&from=${dateFrom}&to=${dateTo}`)).data,
    retry: 1
  });


  const tabs: { key: ReportType; labelKey: string, defaultLabel: string, icon: any }[] = [
    { key: 'pl',          labelKey: 'reports.tabs.pl', defaultLabel: 'P&L Report', icon: TrendingUp },
    { key: 'sales',       labelKey: 'reports.tabs.sales', defaultLabel: 'Sales Report', icon: ShoppingCart },
    { key: 'purchase',    labelKey: 'reports.tabs.purchase', defaultLabel: 'Purchase Report', icon: Package },
    { key: 'stock',       labelKey: 'reports.tabs.stock', defaultLabel: 'Stock Report', icon: ClipboardList },
    { key: 'gst',         labelKey: 'reports.tabs.gst', defaultLabel: 'GST Report', icon: Receipt },
    { key: 'outstanding', labelKey: 'reports.tabs.outstanding', defaultLabel: 'Outstanding', icon: Coins },
    { key: 'customer',    labelKey: 'reports.tabs.customer', defaultLabel: 'Customer Report', icon: Users },
  ];

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
            <FileBarChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('reports.title', 'Reports')}</h1>
            <p className="text-sm text-slate-500">Generate P&L statements, GST filings, sales, stock, and outstanding reports</p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto"><Printer className="h-4 w-4 mr-2" />{t('reports.print', 'Print / Export')}</Button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map(tItem => {
          const Icon = tItem.icon;
          return (
            <button key={tItem.key} onClick={() => setReportType(tItem.key)}
              className={`px-4 py-2.5 rounded-t-xl font-semibold text-sm transition-all duration-150 flex items-center gap-2 border border-transparent ${
                reportType === tItem.key 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50' 
                  : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(tItem.labelKey, tItem.defaultLabel)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-slate-50/50 rounded-lg">
        <div>
          <Label className="text-xs">{t('reports.fromDate', 'From Date')}</Label>
          <AnimatedDatePicker value={dateFrom} onChange={setDateFrom} />
        </div>
        <div>
          <Label className="text-xs">{t('reports.toDate', 'To Date')}</Label>
          <AnimatedDatePicker value={dateTo} onChange={setDateTo} />
        </div>
        <Button onClick={() => refetch()} size="sm"><FileBarChart className="h-4 w-4 mr-1" />{t('common.generate', 'Generate')}</Button>
      </div>


      {isLoading && <div className="text-center py-12 text-slate-500">{t('reports.generating', 'Generating report...')}</div>}

      {/* P&L Report */}
      {!isLoading && reportType === 'pl' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { labelKey: 'reports.kpi.revenue', defaultLabel: 'Total Revenue', value: data.revenue, color: 'text-green-600', icon: TrendingUp },
              { labelKey: 'reports.kpi.purchases', defaultLabel: 'Material Cost (Purchases)', value: data.purchases, color: 'text-orange-600', icon: TrendingDown },
              { labelKey: 'reports.kpi.grossProfit', defaultLabel: 'Gross Profit', value: data.grossProfit, color: data.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600', icon: IndianRupee },
              { labelKey: 'reports.kpi.expenses', defaultLabel: 'Total Expenses', value: data.expenses, color: 'text-red-600', icon: TrendingDown },
              { labelKey: 'reports.kpi.netProfit', defaultLabel: 'Net Profit / Loss', value: data.netProfit, color: data.netProfit >= 0 ? 'text-green-600' : 'text-red-600', icon: data.netProfit >= 0 ? TrendingUp : TrendingDown },
            ].map(item => (
              <Card key={item.defaultLabel} className={`border-l-4 ${item.color.replace('text-', 'border-l-')}`}>
                <CardHeader className="pb-1 flex flex-row items-center justify-between"><CardTitle className="text-xs text-slate-400">{t(item.labelKey, item.defaultLabel)}</CardTitle><item.icon className={`h-4 w-4 ${item.color}`} /></CardHeader>
                <CardContent><div className={`text-xl font-bold ${item.color}`}>₹{item.value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sales Report */}
      {!isLoading && reportType === 'sales' && data && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <span className="font-medium">{t('reports.sales.total', 'Total Sales (Period)')}</span>
              <span className="text-xl font-bold text-green-600">₹{data.total?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </CardContent>
          </Card>
          <DataTable columns={[
            { key: 'invoiceNumber', label: t('reports.sales.cols.invoice', 'Invoice #') },
            { key: 'date', label: t('reports.sales.cols.date', 'Date'), render: (r: any) => <span className="whitespace-nowrap">{format(new Date(r.date), 'dd MMM yyyy')}</span> },
            { key: 'customer', label: t('reports.sales.cols.customer', 'Customer'), render: (r: any) => r.customer?.name },
            { key: 'subTotal', label: t('reports.sales.cols.subTotal', 'Sub Total'), render: (r: any) => `₹${r.subTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { key: 'gstAmount', label: t('reports.sales.cols.gst', 'GST'), render: (r: any) => `₹${r.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { key: 'totalAmount', label: t('reports.sales.cols.total', 'Total'), render: (r: any) => <span className="font-bold">₹{r.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
            { key: 'status', label: t('reports.sales.cols.status', 'Status'), render: (r: any) => <Badge variant={r.status === 'PAID' ? 'default' : 'secondary'}>{String(t(`reports.sales.status.${r.status}`, r.status))}</Badge> },
          ]} data={data.invoices || []} searchKey="invoiceNumber" />
        </div>
      )}

      {/* Purchase Report */}
      {!isLoading && reportType === 'purchase' && data && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <span className="font-medium">{t('reports.purchase.total', 'Total Purchases (Period)')}</span>
              <span className="text-xl font-bold text-orange-600">₹{data.total?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </CardContent>
          </Card>
          <DataTable columns={[
            { key: 'poNumber', label: t('reports.purchase.cols.po', 'PO #') },
            { key: 'createdAt', label: t('reports.purchase.cols.date', 'Date'), render: (r: any) => <span className="whitespace-nowrap">{format(new Date(r.createdAt), 'dd MMM yyyy')}</span> },
            { key: 'supplier', label: t('reports.purchase.cols.supplier', 'Supplier'), render: (r: any) => r.supplier?.name },
            { key: 'items', label: t('reports.purchase.cols.materials', 'Materials'), render: (r: any) => `${r.items?.length} ${t('reports.purchase.items', 'items')}` },
            { key: 'totalAmount', label: t('reports.purchase.cols.total', 'Total'), render: (r: any) => <span className="font-bold">₹{r.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
            { key: 'status', label: t('reports.purchase.cols.status', 'Status'), render: (r: any) => <Badge variant={r.status === 'COMPLETED' ? 'default' : 'secondary'}>{String(t(`reports.purchase.status.${r.status}`, r.status))}</Badge> },
          ]} data={data.orders || []} searchKey="poNumber" />
        </div>
      )}

      {/* Stock Report */}
      {!isLoading && reportType === 'stock' && data && (
        <div className="space-y-4">
          {data.lowStockCount > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">⚠ {data.lowStockCount} {t('reports.stock.lowStockMsg', 'materials are below minimum stock level')}</div>}
          <h3 className="font-semibold">{t('reports.stock.raw', 'Raw Materials')}</h3>
          <DataTable columns={[
            { key: 'name', label: t('reports.stock.cols.material', 'Material') },
            { key: 'unit', label: t('reports.stock.cols.unit', 'Unit'), render: (r: any) => r.unit?.shortName },
            { key: 'currentStock', label: t('reports.stock.cols.currentStock', 'Current Stock'), render: (r: any) => <span className={r.currentStock <= r.minStockLevel ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{r.currentStock}</span> },
            { key: 'minStockLevel', label: t('reports.stock.cols.minLevel', 'Min Level') },
          ]} data={data.materials || []} searchKey="name" />
          <h3 className="font-semibold mt-4">{t('reports.stock.finished', 'Finished Goods')}</h3>
          <DataTable columns={[
            { key: 'model', label: t('reports.stock.cols.model', 'Model'), render: (r: any) => r.model?.name },
            { key: 'color', label: t('reports.stock.cols.color', 'Color'), render: (r: any) => r.color?.name },
            { key: 'size', label: t('reports.stock.cols.size', 'Size'), render: (r: any) => r.size?.name },
            { key: 'quantity', label: t('reports.stock.cols.quantity', 'Quantity'), render: (r: any) => <span className="font-bold">{r.quantity} {t('reports.stock.pcs', 'pcs')}</span> },
          ]} data={data.finished || []} searchKey="quantity" />
        </div>
      )}

      {/* GST Report */}
      {!isLoading && reportType === 'gst' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">{t('reports.gst.output', 'Output GST (Collected)')}</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-green-600">₹{data.outputGst?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">{t('reports.gst.input', 'Input GST (Paid on Purchases)')}</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-orange-600">₹{data.inputGst?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">{t('reports.gst.net', 'Net GST Payable')}</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-primary">₹{data.netGst?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
            </Card>
          </div>
          <DataTable columns={[
            { key: 'invoiceNumber', label: t('reports.gst.cols.invoice', 'Invoice #') },
            { key: 'date', label: t('reports.gst.cols.date', 'Date'), render: (r: any) => <span className="whitespace-nowrap">{format(new Date(r.date), 'dd MMM yyyy')}</span> },
            { key: 'customer', label: t('reports.gst.cols.customer', 'Customer'), render: (r: any) => r.customer?.name },
            { key: 'subTotal', label: t('reports.gst.cols.taxable', 'Taxable Value'), render: (r: any) => `₹${r.subTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { key: 'gstAmount', label: t('reports.gst.cols.gst', 'GST Amount'), render: (r: any) => `₹${r.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { key: 'totalAmount', label: t('reports.gst.cols.total', 'Invoice Total'), render: (r: any) => `₹${r.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          ]} data={data.invoices || []} searchKey="invoiceNumber" />
        </div>
      )}

      {/* Outstanding Report */}
      {!isLoading && reportType === 'outstanding' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">{t('reports.out.customerOutstanding', 'Customer Outstanding')}</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-red-600">₹{data.totalCustomerOutstanding?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400">{t('reports.out.vendorOutstanding', 'Vendor Outstanding')}</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-orange-600">₹{data.totalSupplierOutstanding?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
            </Card>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{t('reports.out.customerDues', 'Customer Dues')}</h3>
            <DataTable columns={[
              { key: 'name', label: t('reports.out.cols.customer', 'Customer') }, { key: 'phone', label: t('reports.out.cols.phone', 'Phone') },
              { key: 'outstandingBalance', label: t('reports.out.cols.outstanding', 'Outstanding'), render: (r: any) => <span className="font-bold text-red-600">₹{r.outstandingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
            ]} data={data.customers || []} searchKey="name" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">{t('reports.out.vendorDues', 'Vendor Dues')}</h3>
            <DataTable columns={[
              { key: 'name', label: t('reports.out.cols.supplier', 'Supplier') }, { key: 'phone', label: t('reports.out.cols.phone', 'Phone') },
              { key: 'outstandingBalance', label: t('reports.out.cols.outstanding', 'Outstanding'), render: (r: any) => <span className="font-bold text-orange-600">₹{r.outstandingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
            ]} data={data.suppliers || []} searchKey="name" />
          </div>
        </div>
      )}

      {/* Customer Report */}
      {!isLoading && reportType === 'customer' && data && (
        <DataTable columns={[
          { key: 'name', label: t('reports.customer.cols.name', 'Customer Name') },
          { key: 'phone', label: t('reports.customer.cols.phone', 'Phone') },
          { key: '_count', label: t('reports.customer.cols.orders', 'Orders'), render: (r: any) => r._count?.orders },
          { key: 'totalRevenue', label: t('reports.customer.cols.revenue', 'Total Revenue'), render: (r: any) => <span className="font-bold text-green-600">₹{r.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
          { key: 'outstandingBalance', label: t('reports.customer.cols.outstanding', 'Outstanding'), render: (r: any) => <span className={r.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}>₹{r.outstandingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        ]} data={data || []} searchKey="name" />
      )}

    </div>
  );
}
