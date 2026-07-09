import { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  Menu, LogOut, LayoutDashboard, ShoppingCart, Package,
  Users, Truck, Settings, BarChart3, IndianRupee, Receipt, Factory, UserCheck, Landmark, X, FileCheck
} from 'lucide-react';

const navGroups = [
  {
    label: 'Core',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Users, label: 'Customers', path: '/customers' },
      { icon: Truck, label: 'Vendors', path: '/suppliers' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { icon: Package, label: 'Inventory', path: '/inventory' },
      { icon: ShoppingCart, label: 'Orders', path: '/orders' },
      { icon: Package, label: 'Products', path: '/products' },
      { icon: Truck, label: 'Purchases', path: '/purchases' },
      { icon: Factory, label: 'Production', path: '/production' },
      { icon: FileCheck, label: 'E-Way Bills', path: '/eway-bills' },
    ]
  },
  {
    label: 'Finance & HR',
    items: [
      { icon: Receipt, label: 'Invoices', path: '/sales' },
      { icon: IndianRupee, label: 'Expenses', path: '/expenses' },
      { icon: Landmark, label: 'Accounts', path: '/finance' },
      { icon: UserCheck, label: 'HR & Payroll', path: '/hr' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: BarChart3, label: 'Reports', path: '/reports' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ]
  },
];

// Helper to convert label to translation key
const getTransKey = (label: string) => {
  return label.replace(/ & /g, '_').replace(/ /g, '').replace(/-/g, '_');
};

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('language', nextLang);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-4 px-5 py-3.5 rounded-xl mx-3 transition-all duration-150 font-semibold text-[15px] ${isActive
      ? 'bg-blue-600 text-white shadow-md shadow-blue-200/60'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed inset-y-0 left-0 z-50 w-80
        bg-white border-r border-slate-100
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        flex flex-col
        shadow-[1px_0_20px_rgba(0,0,0,0.04)]
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-7 h-[76px] border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-300/40">
              <span className="text-white text-xl font-bold tracking-tight">S</span>
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900 leading-tight">ShirtERP</h1>
              <p className="text-[12px] text-blue-500 font-semibold tracking-widest uppercase">Manufacturing ERP</p>
            </div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 space-y-6 sidebar-scroll">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-6 py-2 text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mt-4 mb-1">
                {t(`menu.${getTransKey(group.label)}`, group.label)}
              </h4>
              <div className="space-y-0.5 px-3">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={navLinkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-[22px] w-[22px] flex-shrink-0" />
                    <span>{t(`menu.${getTransKey(item.label)}`, item.label)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-6 border-t border-slate-100 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 text-[14px] font-semibold h-11 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />{t('menu.Logout', 'Logout')}
          </Button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-[70px] flex items-center justify-between px-8 z-10 flex-shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <button
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">

            <label className="theme-switch" title="Toggle Language">
              <input type="checkbox" className="theme-switch__checkbox" checked={i18n.language === 'ta'} onChange={toggleLanguage} />
              <div className="theme-switch__container">
                <span className={`theme-switch__en-label ${i18n.language === 'ta' ? 'opacity-50' : 'opacity-100'}`}>EN</span>
                <span className={`theme-switch__ta-label ${i18n.language === 'en' ? 'opacity-50' : 'opacity-100'}`}>TA</span>
                <div className="theme-switch__circle-container">
                  <div className="theme-switch__sun-moon-container">
                    <div className="theme-switch__moon">
                      <div className="theme-switch__spot"></div>
                      <div className="theme-switch__spot"></div>
                      <div className="theme-switch__spot"></div>
                    </div>
                  </div>
                </div>
                <div className="theme-switch__clouds"></div>
                <div className="theme-switch__stars-container"></div>
              </div>
            </label>

            <span className="text-[14px] text-slate-500 hidden sm:block font-semibold">
              {new Date().toLocaleDateString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-200/60">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-8 w-full animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
