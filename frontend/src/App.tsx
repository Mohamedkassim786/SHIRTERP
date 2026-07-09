import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';

// Core SRS Pages
import Dashboard from './pages/Dashboard';
import Customers from './pages/masters/Customers';
import CustomerProfile from './pages/masters/CustomerProfile';
import Suppliers from './pages/masters/Suppliers';
import SupplierProfile from './pages/masters/SupplierProfile';
import RawMaterials from './pages/inventory/RawMaterials';
import RawMaterialProfile from './pages/inventory/RawMaterialProfile';
import PurchaseOrders from './pages/purchase/PurchaseOrders';
import CustomerOrders from './pages/sales/CustomerOrders';
import SalesInvoices from './pages/sales/SalesInvoices';
import InvoicePrint from './pages/sales/InvoicePrint';
import WorkOrders from './pages/production/WorkOrders';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import Expenses from './pages/expenses/Expenses';
import HR from './pages/hr/HR';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import PaymentReceipt from './pages/sales/PaymentReceipt';
import DiscountInvoicePrint from './pages/sales/SettlementOfferPrint';
import EWayBills from './pages/sales/EWayBills';
import EWayBillPrint from './pages/sales/EWayBillPrint';
import Products from './pages/masters/Products';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30 * 1000, retry: 1 } }
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            {/* Module 3: Customer Management */}
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerProfile />} />
            {/* Module 4: Vendor Management */}
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/:id" element={<SupplierProfile />} />
            {/* Module 5: Inventory Management */}
            <Route path="inventory" element={<RawMaterials />} />
            <Route path="inventory/:id" element={<RawMaterialProfile />} />
            {/* Module 8: Purchase Module */}
            <Route path="purchases" element={<PurchaseOrders />} />
            {/* Module 6 & 7: Sales + Invoice Module */}
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="sales" element={<SalesInvoices />} />
            {/* Module 10: Production Module */}
            <Route path="production" element={<WorkOrders />} />
            {/* Module 9: Expense Management */}
            <Route path="expenses" element={<Expenses />} />
            {/* Accounts & Finance */}
            <Route path="finance" element={<FinanceDashboard />} />
            {/* Module 11: Reports */}
            <Route path="reports" element={<Reports />} />
            {/* Module 12: Settings */}
            <Route path="settings" element={<Settings />} />
            {/* Products (Generic Master Data) */}
            <Route path="products" element={<Products />} />
            {/* E-Way Bills */}
            <Route path="eway-bills" element={<EWayBills />} />
            {/* HR & Payroll */}
            <Route path="hr" element={<HR />} />
          </Route>
          {/* Printable Invoice (no sidebar) */}
          <Route path="/sales/invoice/:id/print" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />
          {/* Printable Payment Receipt (no sidebar) */}
          <Route path="/sales/receipt/:paymentId/print" element={<ProtectedRoute><PaymentReceipt /></ProtectedRoute>} />
          {/* Printable Settlement Offer (no sidebar) */}
          <Route path="/sales/settlement-offer/:id/print" element={<ProtectedRoute><DiscountInvoicePrint /></ProtectedRoute>} />
          {/* Printable E-Way Bill (no sidebar) */}
          <Route path="/eway-bills/:id/print" element={<ProtectedRoute><EWayBillPrint /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
