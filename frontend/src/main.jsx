import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Categories from './pages/Categories.jsx';
import Customers from './pages/Customers.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Inventory from './pages/Inventory.jsx';
import Login from './pages/Login.jsx';
import POS from './pages/POS.jsx';
import Products from './pages/Products.jsx';
import Purchases from './pages/Purchases.jsx';
import Reports from './pages/Reports.jsx';
import Returns from './pages/Returns.jsx';
import Settings from './pages/Settings.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Users from './pages/Users.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/books" element={<Products />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Route>
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
