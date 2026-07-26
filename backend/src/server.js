import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import booksRoutes from './routes/books.routes.js';
import productsRoutes from './routes/products.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import customersRoutes from './routes/customers.routes.js';
import purchasesRoutes from './routes/purchases.routes.js';
import salesRoutes from './routes/sales.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import returnsRoutes from './routes/returns.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import auditRoutes from './routes/audit.routes.js';
import usersRoutes from './routes/users.routes.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', usersRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Bookshop API running on port ${port}`);
});
