# Bookshop Management System

Full-stack Bookshop Management System with Node.js, Express, MySQL, React, Tailwind CSS, JWT authentication, POS billing, inventory, reports, PDF invoices, and WhatsApp notification hooks.

## Project Structure

- `backend/` - Express REST API using `mysql2` pooling
- `frontend/` - React + Vite + Tailwind CSS app
- `backend/.env` - local backend configuration and MySQL credentials

## Database Setup

The backend reads MySQL settings from the first `.env` it finds in the working directory, parent directory, or project root. In this repo, the active config is the project-root `.env`.

Initialize the schema and seed data:

```bash
cd backend
npm run db:init
```

Admin credentials are read from `backend/.env` during seeding:

```text
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=change-this-password
```

## Run The App

From the project root:

```bash
npm start
```

This starts both services together:

- Backend API: `http://localhost:5000/api`
- Frontend app: `http://localhost:5173`

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
DB_NAME=bookshopsms
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=change-this-password
```

API base URL: `http://localhost:5000/api`

Key routes:

- `POST /api/auth/login`
- `POST /api/auth/register` admin only
- `GET/POST/PUT /api/products`
- `POST /api/products/:id/variants/:variantId/adjust`
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

Architecture notes for the expanded POS domain are in `docs/architecture.md`.

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
