import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ category: '', amount: 0, expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', description: '' });

  async function load() {
    const { data } = await api.get('/expenses', { params: { limit: 100 } });
    setItems(data.items || []);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load expenses')); }, []);

  async function save(event) {
    event.preventDefault();
    await api.post('/expenses', form);
    toast.success('Expense recorded');
    setForm({ category: '', amount: 0, expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', description: '' });
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Expenses</h2>
      <form className="panel grid gap-3 rounded-lg p-4 md:grid-cols-5" onSubmit={save}>
        <input className="input" placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
        <input className="input" type="number" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
        <input className="input" type="date" value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} required />
        <select className="input" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>
          <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="mobile_wallet">Mobile wallet</option>
        </select>
        <button className="btn-primary">Record</button>
        <input className="input md:col-span-5" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </form>
      <div className="panel overflow-hidden rounded-lg"><table className="min-w-full text-left text-sm"><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{item.expense_date}</td><td>{item.category}</td><td>Rs {item.amount}</td><td>{item.payment_method}</td><td>{item.description || '-'}</td></tr>)}</tbody></table></div>
    </div>
  );
}
