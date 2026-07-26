import { Plus } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Categories() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', parent_id: '', description: '', status: 'active' });
  const parents = useMemo(() => items.filter((item) => !item.parent_id), [items]);

  async function load() {
    const { data } = await api.get('/categories', { params: { limit: 100 } });
    setItems(data.items || []);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load categories')); }, []);

  async function save(event) {
    event.preventDefault();
    await api.post('/categories', { ...form, parent_id: form.parent_id || null });
    toast.success('Category added');
    setForm({ name: '', parent_id: '', description: '', status: 'active' });
    load();
  }

  async function setStatus(id, status) {
    await api.put(`/categories/${id}`, { status });
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Categories</h2>
      <form className="panel grid gap-3 rounded-lg p-4 md:grid-cols-5" onSubmit={save}>
        <input className="input" placeholder="Category name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <select className="input" value={form.parent_id} onChange={(event) => setForm({ ...form, parent_id: event.target.value })}>
          <option value="">Main category</option>
          {parents.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input className="input md:col-span-2" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <button className="btn-primary"><Plus size={16} /> Add</button>
      </form>
      <div className="panel overflow-hidden rounded-lg">
        <table className="min-w-full text-left text-sm">
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3"><span className="font-medium">{item.name}</span><span className="ml-2 text-slate-500">{item.parent_id ? 'Subcategory' : 'Main'}</span></td>
                <td className="px-4 py-3">{item.description || '-'}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3 text-right"><button className="btn-secondary" onClick={() => setStatus(item.id, item.status === 'active' ? 'inactive' : 'active')}>{item.status === 'active' ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
