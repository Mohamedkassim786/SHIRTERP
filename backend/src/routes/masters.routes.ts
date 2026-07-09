import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

import { 
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getCrmDashboard, getCustomerProfile, createReminder, updateReminderStatus,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierDashboard, getSupplierProfile, recordVendorPayment
} from '../controllers/contacts.controller';
import { getEmployees, createEmployee, updateEmployee } from '../controllers/employees.controller';
import { 
  getProducts, createProduct, getRawMaterials, createRawMaterial, updateRawMaterial,
  getInventoryDashboard, getMaterialHistory, adjustStock 
} from '../controllers/products.controller';
import { sizes, colors, units, departments, categories } from '../controllers/settings.controller';
import { getDashboardStats } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

// Dashboard
router.get('/dashboard', getDashboardStats);

// CRM Dashboard
router.get('/crm/dashboard', getCrmDashboard);
router.post('/reminders', createReminder);
router.put('/reminders/:id/status', updateReminderStatus);

// Contacts
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.get('/customers/:id/profile', getCustomerProfile);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

router.get('/suppliers/dashboard', getSupplierDashboard);
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);
router.get('/suppliers/:id/profile', getSupplierProfile);
router.post('/suppliers/:id/payments', recordVendorPayment);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// Employees
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);

// Products - support both JSON body and multipart (for image upload)
router.get('/products', getProducts);
router.post('/products', (req, res, next) => {
  // If content-type is multipart, use multer
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    upload.single('image')(req, res, next);
  } else {
    next();
  }
}, createProduct);

// Raw Materials & Inventory
router.get('/inventory/dashboard', getInventoryDashboard);
router.post('/inventory/stock/adjustment', adjustStock);
router.get('/raw-materials', getRawMaterials);
router.post('/raw-materials', createRawMaterial);
router.get('/raw-materials/:id/history', getMaterialHistory);
router.put('/raw-materials/:id', updateRawMaterial);

// Settings (Sizes, Colors, Units, etc.)
const makeCrudRoute = (path: string, controller: any) => {
  router.get(path, controller.getAll);
  router.post(path, controller.create);
  router.put(`${path}/:id`, controller.update);
  router.delete(`${path}/:id`, controller.delete);
};

makeCrudRoute('/sizes', sizes);
makeCrudRoute('/colors', colors);
makeCrudRoute('/units', units);
makeCrudRoute('/departments', departments);
makeCrudRoute('/categories', categories);

export default router;
