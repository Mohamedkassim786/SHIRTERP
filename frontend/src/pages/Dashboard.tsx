import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee, Clock, AlertTriangle, Users, TrendingDown,
  ShoppingCart, Receipt, Package, PlusCircle, ArrowRight, Zap,
  Activity, BarChart2, Truck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/api/axios';
import { useAuthStore } from '@/store/auth';

import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/masters/dashboard')).data,
    retry: 1
  });

  const { data: expenseSummary } = useQuery({
    queryKey: ['expense-summary'],
    queryFn: async () => (await api.get('/expenses/summary')).data,
    retry: 1
  });

  const todayRevenue = stats?.todaySales || 0;
  const monthExpenses = expenseSummary?.totalThisMonth || 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const kpis = [
    {
      label: t('dashboard.metrics.totalRevenue', "Today's Sales"),
      value: `₹${todayRevenue.toLocaleString('en-IN')}`,
      sub: t('dashboard.metrics.thisMonth', 'Revenue generated today'),
      icon: IndianRupee,
      gradient: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      link: '/sales',
      trend: '+12.5%'
    },
    {
      label: t('menu.Expenses', 'Month Expenses'),
      value: `₹${monthExpenses.toLocaleString('en-IN')}`,
      sub: t('dashboard.metrics.thisMonth', 'Total expenses this month'),
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-600',
      lightBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      link: '/expenses',
      trend: '-3.2%'
    },
    {
      label: t('dashboard.metrics.pendingOrders', 'Pending Orders'),
      value: stats?.pendingOrders ?? 0,
      sub: t('dashboard.metrics.needsAction', 'Orders awaiting processing'),
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      lightBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      link: '/orders',
      trend: null
    },
    {
      label: t('menu.Customers', 'Total Customers'),
      value: stats?.totalCustomers ?? 0,
      sub: t('menu.Customers', 'Registered customers'),
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      lightBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      link: '/customers',
      trend: '+2 new'
    },
    {
      label: t('dashboard.metrics.stockAlerts', 'Low Stock Alerts'),
      value: stats?.lowStockCount ?? 0,
      sub: t('dashboard.metrics.itemsLow', 'Items below minimum level'),
      icon: AlertTriangle,
      gradient: stats?.lowStockCount > 0 ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-green-600',
      lightBg: stats?.lowStockCount > 0 ? 'bg-red-50' : 'bg-emerald-50',
      iconColor: stats?.lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600',
      link: '/inventory',
      trend: stats?.lowStockCount > 0 ? t('dashboard.metrics.needsAction', 'Action needed') : 'All good'
    },
    {
      label: t('menu.Vendors', 'Total Vendors'),
      value: stats?.totalSuppliers ?? 0,
      sub: t('menu.Vendors', 'Active suppliers'),
      icon: Truck,
      gradient: 'from-purple-500 to-violet-600',
      lightBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      link: '/suppliers',
      trend: null
    },
  ];

  const quickActions = [
    { label: t('menu.Customers', 'Add Customer'), icon: Users, path: '/customers', from: 'from-blue-500', to: 'to-blue-700' },
    { label: t('menu.Invoices', 'Create Invoice'), icon: Receipt, path: '/sales', from: 'from-emerald-500', to: 'to-teal-600' },
    { label: t('menu.Inventory', 'Add Stock'), icon: Package, path: '/inventory', from: 'from-purple-500', to: 'to-violet-600' },
    { label: t('menu.Purchases', 'New Purchase'), icon: ShoppingCart, path: '/purchases', from: 'from-amber-500', to: 'to-orange-500' },
    { label: t('menu.Expenses', 'Add Expense'), icon: IndianRupee, path: '/expenses', from: 'from-rose-500', to: 'to-red-600' },
    { label: t('menu.Orders', 'New Order'), icon: PlusCircle, path: '/orders', from: 'from-slate-600', to: 'to-slate-800' },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 shadow-xl shadow-blue-200/50">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 right-32 w-36 h-36 bg-blue-400/20 rounded-full blur-2xl" />
        <div className="absolute top-4 right-64 w-20 h-20 bg-indigo-300/10 rounded-full blur-xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div>
            <p className="text-blue-200 font-semibold text-sm uppercase tracking-widest mb-1">{greeting} 👋</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">{user?.name || 'Admin'}</h1>
            <p className="text-blue-200/80 mt-2 text-sm font-medium">
              {new Date().toLocaleDateString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">{t('dashboard.metrics.totalRevenue', "Today's Revenue")}</p>
              <p className="text-white text-2xl font-bold mt-0.5">₹{todayRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Activity className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Link to={kpi.link} key={kpi.label} className="group">
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-250 p-6 overflow-hidden cursor-pointer">
              {/* Subtle top gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${kpi.gradient}`} />

              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2.5 tracking-tight leading-none">{kpi.value}</p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">{kpi.sub}</p>
                </div>
                <div className={`${kpi.lightBg} p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-200 flex-shrink-0 ml-4`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.iconColor}`} />
                </div>
              </div>

              {kpi.trend && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${kpi.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-700' :
                      kpi.trend.startsWith('-') ? 'bg-red-50 text-red-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                    {kpi.trend}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200/50">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{t('dashboard.quickActions', 'Quick Actions')}</h2>
            <p className="text-xs text-slate-400 font-medium">{t('dashboard.jumpTo', 'Jump to any module in one click')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`bg-gradient-to-br ${action.from} ${action.to} text-white py-5 px-3 flex flex-col items-center gap-3 rounded-2xl transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-1 hover:scale-[1.03] active:scale-95`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-bold text-center leading-snug text-white/95">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Orders — wider */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200/50">
                <BarChart2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{t('dashboard.recentOrders', 'Recent Orders')}</h2>
                <p className="text-xs text-slate-400 font-medium">{t('dashboard.latestActivity', 'Latest activity')}</p>
              </div>
            </div>
            <Link to="/orders" className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl transition-colors">
              {t('common.viewAll', 'View all')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-1">
            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <ShoppingCart className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-base font-semibold text-slate-500">No orders yet</p>
                <p className="text-sm text-slate-400 mt-1">Create your first order to get started</p>
                <Link to="/orders" className="mt-4 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors">+ Create Order</Link>
              </div>
            ) : (
              stats.recentActivities.map((act: any, i: number) => (
                <div key={act.id} className="flex justify-between items-center py-3.5 px-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i % 3 === 0 ? 'bg-blue-50' : i % 3 === 1 ? 'bg-emerald-50' : 'bg-purple-50'
                      }`}>
                      <ShoppingCart className={`h-4 w-4 ${i % 3 === 0 ? 'text-blue-500' : i % 3 === 1 ? 'text-emerald-500' : 'text-purple-500'
                        }`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{act.action}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">{new Date(act.time).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock Alerts — narrower */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-200/50">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{t('dashboard.metrics.stockAlerts', 'Stock Alerts')}</h2>
                <p className="text-xs text-slate-400 font-medium">{t('dashboard.itemsRunningLow', 'Items running low')}</p>
              </div>
            </div>
            <Link to="/inventory" className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl transition-colors">
              {t('common.manage', 'Manage')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {(!stats?.lowStockMaterials || stats.lowStockMaterials.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <p className="text-base font-semibold text-emerald-700">All stock healthy</p>
                <p className="text-sm text-slate-400 mt-1">No items are below minimum</p>
              </div>
            ) : (
              stats.lowStockMaterials.map((mat: any) => (
                <div key={mat.id} className="bg-red-50/60 border border-red-100 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{mat.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Min: {mat.min} {mat.unit}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-red-600 leading-tight">{mat.current} <span className="text-sm">{mat.unit}</span></p>
                      <span className="text-[10px] uppercase font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">LOW</span>
                    </div>
                  </div>
                  {/* Stock bar */}
                  <div className="mt-3 h-1.5 bg-red-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                      style={{ width: `${Math.min((mat.current / mat.min) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
