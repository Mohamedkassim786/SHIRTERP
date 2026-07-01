# ShirtERP - Manufacturing ERP System

<div align="center">
  <img src="frontend/public/favicon.svg" alt="ShirtERP Logo" width="120" />
  <h3>A Complete End-to-End Enterprise Resource Planning system for Garment Manufacturing</h3>
</div>

## 🚀 Overview

**ShirtERP** is a full-stack, production-ready ERP system designed specifically for the garment manufacturing industry. It tracks the entire lifecycle of a product—from purchasing raw materials and managing warehouse inventory to production tracking, sales invoicing, and double-entry accounting. 

## ✨ Key Features

- **🛍️ Sales & CRM**
  - Customer profile management and outstanding balance tracking
  - Quotation generation and Sales Order management
  - Beautiful, print-ready PDF Invoices with automatic GST calculation
  - **Payment Gateway Integration (Razorpay)** for online invoice payments

- **🏭 Production & Manufacturing**
  - Bill of Materials (BOM) management for different Shirt Models & Sizes
  - Work Order creation and multi-stage production tracking (Cutting, Stitching, Checking, Ironing, Packing)
  - Automatic deduction of raw materials based on BOM when manufacturing

- **📦 Inventory & Purchasing**
  - Raw Material & Finished Goods stock management
  - Low stock alerts and minimum stock level enforcement
  - Supplier/Vendor management and Purchase Orders (PO)
  - Goods Receipt Notes (GRN) and automated stock increment

- **💼 Accounts & Finance**
  - Fully automated Double-Entry Accounting System
  - Auto-posting of Journal Entries for Sales, Purchases, and Expenses
  - Real-time Ledger balances for Assets, Liabilities, Equity, Revenue, and Expenses
  - Comprehensive Daybook and Profit & Loss tracking

- **👥 HR & Payroll**
  - Employee database with role assignments
  - Daily Attendance tracking and Leave management
  - Automated Salary and Payroll processing

## 🛠️ Technology Stack

**Frontend:**
- React (Vite)
- TypeScript
- Tailwind CSS (Custom Premium UI)
- Lucide Icons
- React Router & TanStack Query
- Razorpay Checkout (Client-side)

**Backend:**
- Node.js & Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication & Role-based Authorization
- Razorpay Node SDK

## ⚙️ Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database

### 1. Database Setup
Ensure PostgreSQL is running on your machine. Create a new database named `shirt_erp`.

### 2. Backend Setup
```bash
cd backend
npm install

# Configure your environment variables
cp .env.example .env
# Edit .env with your PostgreSQL database URL and Razorpay keys

# Run Prisma migrations and seed the database with initial data & admin user
npx prisma db push
npx prisma db seed

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start the Vite development server
npm run dev
```

## 🔐 Default Admin Credentials

After running `npx prisma db seed`, you can log in with:
- **Email:** `admin@shirterp.com`
- **Password:** `admin123`

## 💳 Payment Gateway (Razorpay) Setup
1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Settings -> API Keys** and generate **Test Keys**.
3. Log into ShirtERP, navigate to **Settings -> Company Profile**.
4. Paste your `Key ID` and `Key Secret` and click Save. 
5. You can now generate payment links on the Invoice Print page!

---
<div align="center">
  <i>Built with ❤️ for Modern Garment Manufacturing</i>
</div>
