import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', credit_balance: 0 });

  async function load() {
    const { data } = await api.get('/customers', { params: { limit: 50 } });
    setCustomers(data.items);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load customers')); }, []);

  async function save(event) {
    event.preventDefault();
    await api.post('/customers', form);
    toast.success('Customer added');
    setForm({ name: '', phone: '', email: '', address: '', credit_balance: 0 });
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Customers</h2>
      <form className="panel grid gap-3 rounded-lg p-4 md:grid-cols-5" onSubmit={save}>
        {['name', 'phone', 'email', 'address'].map((field) => <input key={field} className="input" placeholder={field} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={field === 'name'} />)}
        <button className="btn-primary">Add customer</button>
      </form>
      <div className="panel rounded-lg p-4">
        {customers.map((customer) => (
          <div key={customer.id} className="flex justify-between border-b border-slate-100 py-3">
            <div><div className="font-medium">{customer.name}</div><div className="text-sm text-slate-500">{customer.phone || customer.email}</div></div>
            <div className="font-medium">Credit Rs {customer.credit_balance}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
