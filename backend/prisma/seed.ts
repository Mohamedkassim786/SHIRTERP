import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding rich sample data...');

  // ─── ROLES & USERS ─────────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' }, update: {},
    create: { name: 'Admin', permissions: { all: true } }
  });
  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' }, update: {},
    create: { name: 'Manager', permissions: { orders: true, production: true } }
  });

  const hash = (pw: string) => bcrypt.hash(pw, 10);
  await prisma.user.upsert({
    where: { email: 'admin@erp.com' }, update: {},
    create: { name: 'Admin User', email: 'admin@erp.com', passwordHash: await hash('admin'), roleId: adminRole.id }
  });
  await prisma.user.upsert({
    where: { email: 'manager@erp.com' }, update: {},
    create: { name: 'Ravi Kumar', email: 'manager@erp.com', passwordHash: await hash('manager123'), roleId: managerRole.id }
  });

  // ─── SIZES ─────────────────────────────────────────────────────────────────
  const sizeNames = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
  const sizeMap: Record<string, any> = {};
  for (const s of sizeNames) {
    sizeMap[s] = await prisma.size.upsert({ where: { name: s }, update: {}, create: { name: s } });
  }

  // ─── COLORS ────────────────────────────────────────────────────────────────
  const colorData = [
    { name: 'Navy Blue', hexCode: '#001f5b' },
    { name: 'Classic White', hexCode: '#FFFFFF' },
    { name: 'Charcoal Black', hexCode: '#36454F' },
    { name: 'Sky Blue', hexCode: '#87CEEB' },
    { name: 'Maroon', hexCode: '#800000' },
    { name: 'Olive Green', hexCode: '#6B8E23' },
    { name: 'Light Grey', hexCode: '#D3D3D3' },
    { name: 'Royal Blue', hexCode: '#4169E1' },
  ];
  const colorMap: Record<string, any> = {};
  for (const c of colorData) {
    colorMap[c.name] = await prisma.color.upsert({ where: { name: c.name }, update: {}, create: c });
  }

  // ─── UNITS ─────────────────────────────────────────────────────────────────
  const mtr = await prisma.unit.upsert({ where: { name: 'Meters' }, update: {}, create: { name: 'Meters', shortName: 'm' } });
  const pcs = await prisma.unit.upsert({ where: { name: 'Pieces' }, update: {}, create: { name: 'Pieces', shortName: 'pcs' } });
  const kg = await prisma.unit.upsert({ where: { name: 'Kilograms' }, update: {}, create: { name: 'Kilograms', shortName: 'kg' } });
  const roll = await prisma.unit.upsert({ where: { name: 'Rolls' }, update: {}, create: { name: 'Rolls', shortName: 'rolls' } });

  // ─── CATEGORIES ────────────────────────────────────────────────────────────
  const catFormal = await prisma.category.upsert({ where: { name: 'Men Formal Shirts' }, update: {}, create: { name: 'Men Formal Shirts' } });
  const catCasual = await prisma.category.upsert({ where: { name: 'Casual T-Shirts' }, update: {}, create: { name: 'Casual T-Shirts' } });
  const catSports = await prisma.category.upsert({ where: { name: 'Sports Wear' }, update: {}, create: { name: 'Sports Wear' } });
  const catKids = await prisma.category.upsert({ where: { name: 'Kids Collection' }, update: {}, create: { name: 'Kids Collection' } });

  // ─── DEPARTMENTS ───────────────────────────────────────────────────────────
  const deptProd = await prisma.department.upsert({ where: { name: 'Production' }, update: {}, create: { name: 'Production' } });
  const deptSales = await prisma.department.upsert({ where: { name: 'Sales' }, update: {}, create: { name: 'Sales' } });
  const deptAccounts = await prisma.department.upsert({ where: { name: 'Accounts' }, update: {}, create: { name: 'Accounts' } });
  const deptQC = await prisma.department.upsert({ where: { name: 'Quality Control' }, update: {}, create: { name: 'Quality Control' } });

  // ─── EMPLOYEES ─────────────────────────────────────────────────────────────
  const employeesData = [
    { name: 'Murugan S', phone: '9876500001', designation: 'Cutting Master', departmentId: deptProd.id, salary: 18000 },
    { name: 'Priya R', phone: '9876500002', designation: 'Stitching Supervisor', departmentId: deptProd.id, salary: 20000 },
    { name: 'Selvi K', phone: '9876500003', designation: 'Quality Inspector', departmentId: deptQC.id, salary: 16000 },
    { name: 'Karthik M', phone: '9876500004', designation: 'Sales Executive', departmentId: deptSales.id, salary: 22000 },
    { name: 'Anitha P', phone: '9876500005', designation: 'Accountant', departmentId: deptAccounts.id, salary: 24000 },
    { name: 'Raj Kumar', phone: '9876500006', designation: 'Packing Head', departmentId: deptProd.id, salary: 17000 },
  ];
  for (const emp of employeesData) {
    await prisma.employee.create({ data: emp }).catch(() => {}); // skip if already exists
  }

  // ─── SUPPLIERS ─────────────────────────────────────────────────────────────
  const sup1 = await prisma.supplier.upsert({ where: { id: 1 }, update: {},
    create: { name: 'Textile Mills Corp', phone: '9123456789', email: 'sales@textilemills.com', address: 'Surat, Gujarat', gstNumber: '24AABCT1234A1Z5' }
  });
  const sup2 = await prisma.supplier.create({
    data: { name: 'Button & Accessories Hub', phone: '9234567890', email: 'info@buttonhub.com', address: 'Tiruppur, Tamil Nadu', gstNumber: '33AABCB5678B1Z9' }
  }).catch(async () => await prisma.supplier.findFirst({ where: { name: 'Button & Accessories Hub' } })) as any;
  const sup3 = await prisma.supplier.create({
    data: { name: 'Premium Thread Works', phone: '9345678901', email: 'contact@premiumthread.com', address: 'Coimbatore, Tamil Nadu' }
  }).catch(async () => await prisma.supplier.findFirst({ where: { name: 'Premium Thread Works' } })) as any;

  // ─── CUSTOMERS ─────────────────────────────────────────────────────────────
  const cust1 = await prisma.customer.upsert({ where: { id: 1 }, update: {},
    create: { name: 'Fashion Retailers Pvt Ltd', phone: '9876543210', email: 'contact@fashionretail.com', address: 'Mumbai, Maharashtra', gstNumber: '27AABCF1234A1Z5' }
  });
  const cust2 = await prisma.customer.create({
    data: { name: 'Star Garments Chennai', phone: '9765432109', email: 'orders@stargarments.com', address: 'Chennai, Tamil Nadu', gstNumber: '33AABCS9876B1Z3' }
  }).catch(async () => await prisma.customer.findFirst({ where: { name: 'Star Garments Chennai' } })) as any;
  const cust3 = await prisma.customer.create({
    data: { name: 'Bangalore Clothing Co', phone: '9654321098', email: 'purchase@bangaloreclothing.com', address: 'Bengaluru, Karnataka' }
  }).catch(async () => await prisma.customer.findFirst({ where: { name: 'Bangalore Clothing Co' } })) as any;
  const cust4 = await prisma.customer.create({
    data: { name: 'Delhi Fashion House', phone: '9543210987', email: 'bulk@delhifashion.com', address: 'New Delhi', gstNumber: '07AABCD5432C1Z7' }
  }).catch(async () => await prisma.customer.findFirst({ where: { name: 'Delhi Fashion House' } })) as any;

  // ─── RAW MATERIALS ─────────────────────────────────────────────────────────
  const matCotton = await prisma.rawMaterial.upsert({ where: { name: 'Premium Cotton Fabric' }, update: {},
    create: { name: 'Premium Cotton Fabric', unitId: mtr.id, currentStock: 850, minStockLevel: 200 }
  });
  const matPolyester = await prisma.rawMaterial.upsert({ where: { name: 'Polyester Fabric' }, update: {},
    create: { name: 'Polyester Fabric', unitId: mtr.id, currentStock: 320, minStockLevel: 100 }
  });
  const matButtons = await prisma.rawMaterial.upsert({ where: { name: 'Standard Buttons' }, update: {},
    create: { name: 'Standard Buttons', unitId: pcs.id, currentStock: 12000, minStockLevel: 3000 }
  });
  const matThread = await prisma.rawMaterial.upsert({ where: { name: 'Stitching Thread (Blue)' }, update: {},
    create: { name: 'Stitching Thread (Blue)', unitId: mtr.id, currentStock: 8000, minStockLevel: 2000 }
  });
  const matThread2 = await prisma.rawMaterial.upsert({ where: { name: 'Stitching Thread (White)' }, update: {},
    create: { name: 'Stitching Thread (White)', unitId: mtr.id, currentStock: 6500, minStockLevel: 2000 }
  });
  const matInterlining = await prisma.rawMaterial.upsert({ where: { name: 'Collar Interlining' }, update: {},
    create: { name: 'Collar Interlining', unitId: mtr.id, currentStock: 90, minStockLevel: 150 } // Low stock!
  });
  const matZipper = await prisma.rawMaterial.upsert({ where: { name: 'Metal Zippers' }, update: {},
    create: { name: 'Metal Zippers', unitId: pcs.id, currentStock: 450, minStockLevel: 500 } // Low stock!
  });
  const matLabel = await prisma.rawMaterial.upsert({ where: { name: 'Brand Labels' }, update: {},
    create: { name: 'Brand Labels', unitId: pcs.id, currentStock: 3000, minStockLevel: 1000 }
  });
  const matPacket = await prisma.rawMaterial.upsert({ where: { name: 'Polybag Packaging' }, update: {},
    create: { name: 'Polybag Packaging', unitId: pcs.id, currentStock: 4000, minStockLevel: 1000 }
  });

  // ─── SHIRT MODELS + BOM ────────────────────────────────────────────────────
  const model1 = await prisma.product.upsert({ where: { name: 'Oxford Navy Blue Formal' }, update: {},
    create: {
      name: 'Oxford Navy Blue Formal', categoryId: catFormal.id, hsnCode: '6205',
      boms: { create: [
        { materialId: matCotton.id, quantityPerUnit: 1.5 },
        { materialId: matButtons.id, quantityPerUnit: 8 },
        { materialId: matThread.id, quantityPerUnit: 25 },
        { materialId: matInterlining.id, quantityPerUnit: 0.3 },
        { materialId: matLabel.id, quantityPerUnit: 1 },
        { materialId: matPacket.id, quantityPerUnit: 1 },
      ]}
    }
  });

  const model2 = await prisma.product.upsert({ where: { name: 'Classic White Formal' }, update: {},
    create: {
      name: 'Classic White Formal', categoryId: catFormal.id, hsnCode: '6205',
      boms: { create: [
        { materialId: matCotton.id, quantityPerUnit: 1.5 },
        { materialId: matButtons.id, quantityPerUnit: 8 },
        { materialId: matThread2.id, quantityPerUnit: 25 },
        { materialId: matInterlining.id, quantityPerUnit: 0.3 },
        { materialId: matLabel.id, quantityPerUnit: 1 },
        { materialId: matPacket.id, quantityPerUnit: 1 },
      ]}
    }
  });

  const model3 = await prisma.product.upsert({ where: { name: 'Casual Sky Blue T-Shirt' }, update: {},
    create: {
      name: 'Casual Sky Blue T-Shirt', categoryId: catCasual.id, hsnCode: '6109',
      boms: { create: [
        { materialId: matCotton.id, quantityPerUnit: 0.8 },
        { materialId: matThread.id, quantityPerUnit: 15 },
        { materialId: matLabel.id, quantityPerUnit: 1 },
        { materialId: matPacket.id, quantityPerUnit: 1 },
      ]}
    }
  });

  const model4 = await prisma.product.upsert({ where: { name: 'Polyester Sports Tee' }, update: {},
    create: {
      name: 'Polyester Sports Tee', categoryId: catSports.id, hsnCode: '6109',
      boms: { create: [
        { materialId: matPolyester.id, quantityPerUnit: 0.7 },
        { materialId: matThread2.id, quantityPerUnit: 12 },
        { materialId: matZipper.id, quantityPerUnit: 1 },
        { materialId: matLabel.id, quantityPerUnit: 1 },
        { materialId: matPacket.id, quantityPerUnit: 1 },
      ]}
    }
  });

  // ─── PURCHASE ORDERS (completed) ───────────────────────────────────────────
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0001', supplierId: sup1.id, status: 'COMPLETED', totalAmount: 85000,
      items: { create: [
        { materialId: matCotton.id, quantity: 200, unitPrice: 350, totalPrice: 70000 },
        { materialId: matPolyester.id, quantity: 100, unitPrice: 150, totalPrice: 15000 },
      ]}
    }
  });
  const grn1Count = await prisma.gRN.count();
  await prisma.gRN.create({ data: { grnNumber: `GRN-2026-${String(grn1Count + 1).padStart(4, '0')}`, poId: po1.id } });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0002', supplierId: sup2.id, status: 'COMPLETED', totalAmount: 24000,
      items: { create: [
        { materialId: matButtons.id, quantity: 8000, unitPrice: 2, totalPrice: 16000 },
        { materialId: matZipper.id, quantity: 400, unitPrice: 20, totalPrice: 8000 },
      ]}
    }
  });
  const grn2Count = await prisma.gRN.count();
  await prisma.gRN.create({ data: { grnNumber: `GRN-2026-${String(grn2Count + 1).padStart(4, '0')}`, poId: po2.id } });

  const po3 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0003', supplierId: sup3.id, status: 'PENDING', totalAmount: 12000,
      items: { create: [
        { materialId: matThread.id, quantity: 2000, unitPrice: 3, totalPrice: 6000 },
        { materialId: matThread2.id, quantity: 2000, unitPrice: 3, totalPrice: 6000 },
      ]}
    }
  });

  // ─── CUSTOMER ORDERS ───────────────────────────────────────────────────────
  const order1 = await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-2026-0001', customerId: cust1.id,
      deliveryDate: new Date('2026-07-15'), status: 'DELIVERED',
      items: { create: [
        { modelId: model1.id, colorId: colorMap['Navy Blue'].id, sizeId: sizeMap['M'].id, quantity: 100, unitPrice: 650, totalPrice: 65000 },
        { modelId: model1.id, colorId: colorMap['Navy Blue'].id, sizeId: sizeMap['L'].id, quantity: 80, unitPrice: 650, totalPrice: 52000 },
        { modelId: model2.id, colorId: colorMap['Classic White'].id, sizeId: sizeMap['M'].id, quantity: 60, unitPrice: 680, totalPrice: 40800 },
      ]}
    }
  });

  const order2 = await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-2026-0002', customerId: cust2.id,
      deliveryDate: new Date('2026-07-20'), status: 'IN_PRODUCTION',
      items: { create: [
        { modelId: model3.id, colorId: colorMap['Sky Blue'].id, sizeId: sizeMap['S'].id, quantity: 150, unitPrice: 350, totalPrice: 52500 },
        { modelId: model3.id, colorId: colorMap['Sky Blue'].id, sizeId: sizeMap['M'].id, quantity: 200, unitPrice: 350, totalPrice: 70000 },
      ]}
    }
  });

  const order3 = await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-2026-0003', customerId: cust3.id,
      deliveryDate: new Date('2026-08-01'), status: 'PENDING',
      items: { create: [
        { modelId: model4.id, colorId: colorMap['Charcoal Black'].id, sizeId: sizeMap['L'].id, quantity: 120, unitPrice: 420, totalPrice: 50400 },
        { modelId: model4.id, colorId: colorMap['Charcoal Black'].id, sizeId: sizeMap['XL'].id, quantity: 80, unitPrice: 420, totalPrice: 33600 },
      ]}
    }
  });

  const order4 = await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-2026-0004', customerId: cust4.id,
      deliveryDate: new Date('2026-07-30'), status: 'PENDING',
      items: { create: [
        { modelId: model1.id, colorId: colorMap['Maroon'].id, sizeId: sizeMap['M'].id, quantity: 200, unitPrice: 670, totalPrice: 134000 },
        { modelId: model2.id, colorId: colorMap['Classic White'].id, sizeId: sizeMap['L'].id, quantity: 150, unitPrice: 700, totalPrice: 105000 },
      ]}
    }
  });

  // ─── WORK ORDERS ───────────────────────────────────────────────────────────
  const wo1 = await prisma.workOrder.create({
    data: {
      woNumber: 'WO-2026-0001', orderId: order1.id, targetQty: 240,
      status: 'COMPLETED', startDate: new Date('2026-06-10'), endDate: new Date('2026-06-18'),
      stages: { create: [
        { stageName: 'CUTTING', qtyIn: 240, qtyOut: 238, rejectedQty: 2 },
        { stageName: 'STITCHING', qtyIn: 238, qtyOut: 235, rejectedQty: 3 },
        { stageName: 'CHECKING', qtyIn: 235, qtyOut: 232, rejectedQty: 3 },
        { stageName: 'IRONING', qtyIn: 232, qtyOut: 232, rejectedQty: 0 },
        { stageName: 'PACKING', qtyIn: 232, qtyOut: 230, rejectedQty: 2 },
      ]}
    }
  });

  const wo2 = await prisma.workOrder.create({
    data: {
      woNumber: 'WO-2026-0002', orderId: order2.id, targetQty: 350,
      status: 'RUNNING', startDate: new Date('2026-06-20'),
      stages: { create: [
        { stageName: 'CUTTING', qtyIn: 350, qtyOut: 348, rejectedQty: 2 },
        { stageName: 'STITCHING', qtyIn: 348, qtyOut: 340, rejectedQty: 8 },
      ]}
    }
  });

  // ─── FINISHED GOODS ────────────────────────────────────────────────────────
  const fgData = [
    { modelId: model1.id, colorId: colorMap['Navy Blue'].id, sizeId: sizeMap['M'].id, quantity: 80 },
    { modelId: model1.id, colorId: colorMap['Navy Blue'].id, sizeId: sizeMap['L'].id, quantity: 65 },
    { modelId: model2.id, colorId: colorMap['Classic White'].id, sizeId: sizeMap['M'].id, quantity: 55 },
    { modelId: model2.id, colorId: colorMap['Classic White'].id, sizeId: sizeMap['L'].id, quantity: 30 },
    { modelId: model3.id, colorId: colorMap['Sky Blue'].id, sizeId: sizeMap['S'].id, quantity: 45 },
    { modelId: model3.id, colorId: colorMap['Sky Blue'].id, sizeId: sizeMap['M'].id, quantity: 90 },
  ];
  for (const fg of fgData) {
    await prisma.finishedGood.upsert({
      where: { modelId_colorId_sizeId: { modelId: fg.modelId, colorId: fg.colorId, sizeId: fg.sizeId } },
      update: { quantity: fg.quantity },
      create: fg
    });
  }

  // ─── SALES INVOICES ────────────────────────────────────────────────────────
  const inv1 = await prisma.salesInvoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001', customerId: cust1.id, orderId: order1.id,
      subTotal: 140000, gstAmount: 7000, totalAmount: 147000, status: 'PAID',
      date: new Date('2026-06-19'),
      items: { create: [
        { modelId: model1.id, colorId: colorMap['Navy Blue'].id, sizeId: sizeMap['M'].id, quantity: 100, unitPrice: 650, gstPercent: 5, totalPrice: 68250 },
        { modelId: model1.id, colorId: colorMap['Navy Blue'].id, sizeId: sizeMap['L'].id, quantity: 80, unitPrice: 650, gstPercent: 5, totalPrice: 54600 },
        { modelId: model2.id, colorId: colorMap['Classic White'].id, sizeId: sizeMap['M'].id, quantity: 60, unitPrice: 680, gstPercent: 5, totalPrice: 42840 },
      ]}
    }
  });

  // ─── CUSTOMER PAYMENTS ─────────────────────────────────────────────────────
  await prisma.customerPayment.create({
    data: { customerId: cust1.id, amount: 147000, method: 'BANK_TRANSFER', reference: 'UTR2026061900001', date: new Date('2026-06-20') }
  });
  await prisma.customerPayment.create({
    data: { customerId: cust2.id, amount: 50000, method: 'UPI', reference: 'UPI2026062100099', date: new Date('2026-06-21') }
  });

  // ─── UPDATE CUSTOMER OUTSTANDING BALANCES ──────────────────────────────────
  await prisma.customer.update({ where: { id: cust2.id }, data: { outstandingBalance: 72500 } });
  await prisma.customer.update({ where: { id: cust3.id }, data: { outstandingBalance: 84000 } });
  await prisma.customer.update({ where: { id: cust4.id }, data: { outstandingBalance: 239000 } });

  console.log('✅ Rich sample data seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('  • 4 Customers, 3 Suppliers, 6 Employees');
  console.log('  • 4 Shirt Models with BOMs, 9 Raw Materials');
  console.log('  • 3 Purchase Orders (2 completed, 1 pending)');
  console.log('  • 4 Customer Orders (delivered, in-production, 2 pending)');
  console.log('  • 2 Work Orders with production stage history');
  console.log('  • 6 Finished Goods inventory entries');
  console.log('  • 1 Sales Invoice (PAID), 2 Customer Payments');
  console.log('  • 2 Low Stock alerts (Collar Interlining, Metal Zippers)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
