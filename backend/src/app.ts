import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import mastersRoutes from './routes/masters.routes';
import purchaseRoutes from './routes/purchase.routes';
import productionRoutes from './routes/production.routes';
import salesRoutes from './routes/sales.routes';
import reportsRoutes from './routes/reports.routes';
import expensesRoutes from './routes/expenses.routes';
import quotationsRoutes from './routes/quotations.routes';
import hrRoutes from './routes/hr.routes';
import adminRoutes from './routes/admin.routes';
import systemRoutes from './routes/system.routes';
import financeRoutes from './routes/finance.routes';
import paymentRoutes from './routes/payment.routes';
import ewaybillRoutes from './routes/ewaybill.routes';

import { errorHandler } from './middleware/error.middleware';
import { getFullReports } from './controllers/reports.controller';
import { authenticate } from './middleware/auth.middleware';
import { activityLogger } from './middleware/activity.middleware';

dotenv.config();

// ── Startup Env Validation ─────────────────────────────────────────────────────
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[STARTUP ERROR] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet());

// CORS — allow common Vite ports in development
const allowedOrigins = process.env.CORS_ORIGIN 
  ? [process.env.CORS_ORIGIN]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiter — for ALL API routes (general protection: 200 req / 15 min per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Strict rate limiter — for login (10 attempts / 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again after 15 minutes.' },
});

app.use('/api', generalLimiter);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Activity Logger ────────────────────────────────────────────────────────────
// Runs on finish, so req.user will be populated by the time it executes
app.use(activityLogger);

// ── Routes ─────────────────────────────────────────────────────────────────────
// Auth — strict rate limiter on login
app.use('/api/auth', loginLimiter, authRoutes);

// Protected routes
app.use('/api/system', systemRoutes);
app.use('/api/masters', mastersRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/eway-bills', ewaybillRoutes);

// Full Reports API (kept as-is per architecture rules)
app.get('/api/full-reports', authenticate, getFullReports);

// Static file serving (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Error Handling ─────────────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT} | ENV: ${process.env.NODE_ENV} | CORS: ${allowedOrigins.join(', ')}`);
});

export default app;
