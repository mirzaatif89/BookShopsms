import React from 'react';
import { BookOpen, ChartColumn, LayoutDashboard, LogOut, Receipt, ShoppingBag, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier'] },
  { to: '/books', label: 'Books', icon: BookOpen, roles: ['admin', 'manager', 'cashier'] },
  { to: '/pos', label: 'POS', icon: Receipt, roles: ['admin', 'manager', 'cashier'] },
  { to: '/purchases', label: 'Purchases', icon: ShoppingBag, roles: ['admin', 'manager'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'manager', 'cashier'] },
  { to: '/reports', label: 'Reports', icon: ChartColumn, roles: ['admin', 'manager'] }
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visible = nav.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen md:flex">
      <aside className="panel md:fixed md:inset-y-0 md:w-64">
        <div className="border-b border-slate-200 px-5 py-4">
          <h1 className="text-lg font-semibold">Bookshop</h1>
          <p className="text-sm text-slate-500">{user.name} · {user.role}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:block">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-100'}`}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <button className="m-3 hidden items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 md:flex" onClick={() => { logout(); navigate('/login'); }}>
          <LogOut size={18} /> Logout
        </button>
      </aside>
      <main className="w-full p-4 md:ml-64 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
