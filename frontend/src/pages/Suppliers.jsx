import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const empty = { name: '', contact_person: '', contact_number: '', email: '', address: '', opening_balance: 0, current_balance: 0, notes: '' };

export default function Suppliers() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await api.get('/suppliers', { params: { limit: 100 } });
    setItems(data.items || []);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load suppliers')); }, []);

  async function save(event) {
    event.preventDefault();
    await api.post('/suppliers', form);
    toast.success('Supplier added');
    setForm(empty);
    load();
  }

  return (
    <CrudPage title="Suppliers" form={form} setForm={setForm} save={save} items={items} fields={['name', 'contact_person', 'contact_number', 'email', 'address', 'opening_balance', 'current_balance', 'notes']} />
  );
}

function CrudPage({ title, form, setForm, save, items, fields }) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <form className="panel grid gap-3 rounded-lg p-4 md:grid-cols-4" onSubmit={save}>
        {fields.map((field) => <input key={field} className="input" placeholder={field.replace('_', ' ')} value={form[field] || ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required={field === 'name'} />)}
        <button className="btn-primary">Add supplier</button>
      </form>
      <div className="panel overflow-hidden rounded-lg">
        <table className="min-w-full text-left text-sm"><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{item.name}</td><td>{item.contact_person || '-'}</td><td>{item.contact_number || '-'}</td><td>Balance Rs {item.current_balance || 0}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
