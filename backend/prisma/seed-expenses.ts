import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  // Expense categories
  const rent = await prisma.expenseCategory.upsert({ where: { name: 'Rent' }, update: {}, create: { name: 'Rent' } });
  const elec = await prisma.expenseCategory.upsert({ where: { name: 'Electricity' }, update: {}, create: { name: 'Electricity' } });
  const sal = await prisma.expenseCategory.upsert({ where: { name: 'Salaries' }, update: {}, create: { name: 'Salaries' } });
  const trans = await prisma.expenseCategory.upsert({ where: { name: 'Transport' }, update: {}, create: { name: 'Transport' } });
  const maint = await prisma.expenseCategory.upsert({ where: { name: 'Maintenance' }, update: {}, create: { name: 'Maintenance' } });
  const misc = await prisma.expenseCategory.upsert({ where: { name: 'Miscellaneous' }, update: {}, create: { name: 'Miscellaneous' } });

  await prisma.expense.createMany({ data: [
    { categoryId: rent.id, amount: 15000, description: 'Factory rent - June 2026', paidBy: 'BANK', date: new Date('2026-06-01') },
    { categoryId: elec.id, amount: 4200, description: 'Electricity bill - May 2026', paidBy: 'BANK', date: new Date('2026-06-05') },
    { categoryId: trans.id, amount: 2500, description: 'Delivery vehicle diesel', paidBy: 'CASH', date: new Date('2026-06-10') },
    { categoryId: sal.id, amount: 117000, description: 'Staff salaries - June 2026', paidBy: 'BANK', date: new Date('2026-06-30') },
    { categoryId: misc.id, amount: 800, description: 'Office supplies', paidBy: 'CASH', date: new Date('2026-06-15') },
    { categoryId: elec.id, amount: 3800, description: 'Electricity bill - June 2026', paidBy: 'BANK', date: new Date('2026-06-28') },
    { categoryId: maint.id, amount: 3500, description: 'Sewing machine servicing', paidBy: 'CASH', date: new Date('2026-06-20') },
    { categoryId: trans.id, amount: 1800, description: 'Auto fare for delivery', paidBy: 'CASH', date: new Date('2026-06-22') },
  ] });

  await prisma.companySettings.create({ data: {
    companyName: 'Sri Murugan Garments',
    address: '45, Industrial Estate, Tiruppur - 641604, Tamil Nadu',
    phone: '0421-2234567',
    email: 'info@srimurugangarments.com',
    gstin: '33AABCS1234B1Z9',
    invoicePrefix: 'SMG',
    defaultGst: 5,
    invoiceFooter: 'Thank you for your business!',
    termsConditions: 'Payment due within 30 days. Goods once sold will not be taken back.',
    bankDetails: 'A/C: 1234567890 | IFSC: SBIN0001234 | State Bank of India, Tiruppur'
  } }).catch(() => console.log('Company settings already exists'));

  console.log('✅ Expense categories + sample expenses + company settings added!');
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
