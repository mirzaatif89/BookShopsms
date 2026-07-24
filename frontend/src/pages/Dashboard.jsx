import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  CalendarDays,
  Receipt,
  Search,
  ShoppingCart,
  TrendingUp,
  Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api.js';

export default function Dashboard() {
  const [summary, setSummary] = useState({ daily: [] });
  const [lowStock, setLowStock] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/reports/sales-summary'),
      api.get('/reports/low-stock'),
      api.get('/reports/best-selling')
    ])
      .then(([sales, stock, sellers]) => {
        if (sales.status === 'fulfilled') setSummary(sales.value.data);
        if (stock.status === 'fulfilled') setLowStock(stock.value.data.items || []);
        if (sellers.status === 'fulfilled') setBestSellers(sellers.value.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const daily = summary.daily || [];
  const today = daily.at(-1);
  const yesterday = daily.at(-2);
  const total30 = daily.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const order30 = daily.reduce((sum, row) => sum + Number(row.orders || 0), 0);
  const averageOrder = order30 ? total30 / order30 : 0;
  const todayTotal = Number(today?.total || 0);
  const yesterdayTotal = Number(yesterday?.total || 0);
  const change = yesterdayTotal ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;
  const topSeller = bestSellers[0];
  const chartData = daily.map((row) => ({
    ...row,
    total: Number(row.total || 0),
    orders: Number(row.orders || 0),
    label: formatPeriod(row.period)
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white md:p-8">
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-emerald-50 ring-1 ring-white/15">
                <CalendarDays size={16} />
                {new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date())}
              </span>
              <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-semibold text-slate-950">
                Live store view
              </span>
            </div>
            <p className="text-sm font-medium uppercase text-emerald-200">Bookshop Management</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold md:text-4xl">
              Clean view of today&apos;s sales, stock, and movement.
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Today sales" value={currency(todayTotal)} />
              <HeroMetric label="Today orders" value={today?.orders || 0} />
              <HeroMetric label="Avg order" value={currency(averageOrder)} />
            </div>
          </div>
          <div className="flex flex-col justify-between bg-amber-50 p-6">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-400 text-slate-950">
                <BookOpen />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">Fast actions</h3>
              <p className="mt-1 text-sm text-slate-600">Open the screens used most during counter work.</p>
            </div>
            <div className="mt-6 grid gap-3">
              <QuickAction to="/pos" icon={ShoppingCart} label="New Sale" />
              <QuickAction to="/books" icon={Search} label="Find Book" />
              <QuickAction to="/customers" icon={Users} label="Customers" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Receipt} label="Today sales" value={currency(todayTotal)} tone="emerald" helper={loading ? 'Loading...' : trendLabel(change)} />
        <StatCard icon={TrendingUp} label="30-day sales" value={currency(total30)} tone="blue" helper={`${order30} orders recorded`} />
        <StatCard icon={Boxes} label="Average order" value={currency(averageOrder)} tone="violet" helper="Across visible sales" />
        <StatCard icon={AlertTriangle} label="Low stock" value={lowStock.length} tone="rose" helper="Items at reorder level" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel rounded-lg p-4 md:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">Sales Trend</h3>
              <p className="text-sm text-slate-500">Revenue and order activity for the last 30 days.</p>
            </div>
            <Link className="btn-secondary" to="/reports">
              Reports <ArrowRight size={16} />
            </Link>
          </div>
          <div className="h-80">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => currency(value)} labelStyle={{ color: '#0f172a' }} />
                  <Area type="monotone" dataKey="total" stroke="#059669" strokeWidth={3} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message={loading ? 'Loading sales...' : 'No sales data available yet.'} />
            )}
          </div>
        </section>

        <section className="panel rounded-lg p-4 md:p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-slate-950">Best Sellers</h3>
            <p className="text-sm text-slate-500">Books moving fastest from inventory.</p>
          </div>
          <div className="h-80">
            {bestSellers.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestSellers.slice(0, 6).map((item) => ({ ...item, shortTitle: shorten(item.title), quantity_sold: Number(item.quantity_sold || 0) }))} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="category" dataKey="shortTitle" width={92} tickLine={false} axisLine={false} tick={{ fill: '#334155', fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} sold`, 'Quantity']} />
                  <Bar dataKey="quantity_sold" fill="#2563eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message={loading ? 'Loading books...' : 'No best sellers yet.'} />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <section className="panel rounded-lg p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">Inventory Watch</h3>
              <p className="text-sm text-slate-500">Low-stock books that need attention.</p>
            </div>
            <Link className="btn-secondary" to="/books">
              Books <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {lowStock.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-950">{item.title}</p>
                  <p className="text-sm text-slate-500">ISBN {item.isbn || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-rose-700">{item.stock_quantity}</p>
                  <p className="text-xs text-slate-500">min {item.reorder_level}</p>
                </div>
              </div>
            ))}
            {!lowStock.length && <EmptyState message={loading ? 'Checking stock...' : 'All stocked above reorder level.'} compact />}
          </div>
        </section>

        <section className="panel rounded-lg p-4 md:p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-slate-950">Today&apos;s Snapshot</h3>
            <p className="text-sm text-slate-500">A quick operating summary for the counter.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Snapshot label="Top book" value={topSeller?.title || 'No sales yet'} detail={topSeller ? `${topSeller.quantity_sold} sold` : 'Start selling from POS'} />
            <Snapshot label="Stock alerts" value={lowStock.length} detail="Items to reorder" />
            <Snapshot label="30-day orders" value={order30} detail={currency(total30)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
      <p className="text-sm text-emerald-100">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, helper, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700'
  };

  return (
    <div className="panel rounded-lg p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link className="flex items-center justify-between rounded-lg bg-white px-4 py-3 font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md" to={to}>
      <span className="flex items-center gap-3">
        <Icon size={18} className="text-amber-700" />
        {label}
      </span>
      <ArrowRight size={16} className="text-slate-400" />
    </Link>
  );
}

function Snapshot({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function EmptyState({ message, compact = false }) {
  return (
    <div className={`flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 ${compact ? 'min-h-24' : 'h-full'}`}>
      {message}
    </div>
  );
}

function currency(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function trendLabel(value) {
  if (!value) return 'No previous-day comparison';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}% vs previous day`;
}

function formatPeriod(period) {
  if (!period) return '';
  return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short' }).format(new Date(period));
}

function shorten(text) {
  if (!text) return 'Untitled';
  return text.length > 18 ? `${text.slice(0, 16)}...` : text;
}
