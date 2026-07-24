import React, { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api.js';

export default function Reports() {
  const [summary, setSummary] = useState({ monthly: [] });
  const [top, setTop] = useState([]);
  const [profit, setProfit] = useState({ stock_valuation: {} });

  useEffect(() => {
    Promise.all([api.get('/reports/sales-summary'), api.get('/reports/best-selling'), api.get('/reports/profit-loss')])
      .then(([sales, best, pnl]) => {
        setSummary(sales.data);
        setTop(best.data.items);
        setProfit(pnl.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Reports</h2>
      <section className="panel rounded-lg p-4">
        <h3 className="mb-4 font-semibold">Monthly sales</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...summary.monthly].reverse()}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel rounded-lg p-4">
        <h3 className="mb-3 font-semibold">Top-selling books</h3>
        {top.map((book) => <div key={book.id} className="flex justify-between border-b border-slate-100 py-2"><span>{book.title}</span><span>{book.quantity_sold} sold</span></div>)}
      </section>
      <section className="panel rounded-lg p-4">
        <h3 className="font-semibold">Stock valuation</h3>
        <p className="mt-2 text-sm text-slate-600">Cost value: Rs {profit.stock_valuation?.cost_value || 0}</p>
        <p className="text-sm text-slate-600">Retail value: Rs {profit.stock_valuation?.retail_value || 0}</p>
      </section>
    </div>
  );
}
