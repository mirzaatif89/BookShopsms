# Bookshop Management System

Full-stack Bookshop Management System with Node.js, Express, MySQL, React, Tailwind CSS, JWT authentication, POS billing, inventory, reports, PDF invoices, and WhatsApp notification hooks.

## Project Structure

- `backend/` - Express REST API using `mysql2` pooling
- `frontend/` - React + Vite + Tailwind CSS app
- `backend/.env` - local backend configuration and MySQL credentials

## Database Setup

The backend reads MySQL settings from `backend/.env`. Make sure the database named in `DB_NAME` exists and is reachable.

Seeded admin login:

```text
email: admin@admin.com
password: admin123
```

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

The current local `.env` contains the MySQL connection values:

```text
DB_HOST=localhost
DB_USER=root
DB_NAME=BookShopsms
```

API base URL: `http://localhost:5000/api`

Key routes:

- `POST /api/auth/login`
- `POST /api/auth/register` admin only
- `GET/POST/PUT/DELETE /api/books`
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/PUT/DELETE /api/suppliers`
- `GET/POST/PUT/DELETE /api/customers`
- `POST /api/purchases`, `POST /api/purchases/:id/receive`
- `POST /api/sales`, `GET /api/sales/:id/invoice`
- `GET /api/reports/sales-summary`
- `GET /api/reports/best-selling`
- `GET /api/reports/low-stock`
- `GET /api/reports/profit-loss`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Implemented Frontend Pages

- Login with JWT storage and protected routing
- Dashboard with sales cards and Recharts chart
- Books inventory with add/edit/delete, search, category filter, and low-stock highlighting
- POS/Billing with ISBN/search input, cart, discount, payment method, checkout, and invoice PDF opening
- Purchases list with receive-stock action
- Customers list/add with credit balance display
- Reports with sales trend, top-selling books, and stock valuation

## WhatsApp Notifications

The backend includes a `whatsapp-web.js` integration hook for low-stock and stock-arrival alerts. Set `ADMIN_WHATSAPP_NUMBER` in `.env`. First-time use requires WhatsApp Web authentication in the runtime environment.
# BookShopsms
