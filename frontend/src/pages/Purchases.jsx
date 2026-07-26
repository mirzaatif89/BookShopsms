import { Plus, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Purchases() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ supplier_id: '', status: 'pending', payment_method: 'cash', amount_paid: 0, rows: [] });

  async function load() {
    const [{ data: purchaseData }, { data: supplierData }, { data: variantData }] = await Promise.all([
      api.get('/purchases'),
      api.get('/suppliers', { params: { limit: 100 } }),
      api.get('/products/variants/search', { params: { search: query } })
    ]);
    setItems(purchaseData.items || []);
    setSuppliers(supplierData.items || []);
    setVariants(variantData.items || []);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load purchases')); }, []);

  function addRow(variantId) {
    const variant = variants.find((item) => Number(item.product_variant_id) === Number(variantId));
    if (!variant) return;
    setForm((current) => ({
      ...current,
      rows: [...current.rows, { product_variant_id: variant.product_variant_id, title: `${variant.product_name} - ${variant.variant_name}`, quantity: 1, unit_cost: Number(variant.purchase_price || 0) }]
    }));
  }

  async function save(event) {
    event.preventDefault();
    await api.post('/purchases', {
      supplier_id: form.supplier_id,
      status: form.status,
      payment_method: form.payment_method,
      amount_paid: form.amount_paid,
      items: form.rows
    });
    toast.success('Purchase saved');
    setForm({ supplier_id: '', status: 'pending', payment_method: 'cash', amount_paid: 0, rows: [] });
    load();
  }

  async function receive(id) {
    await api.post(`/purchases/${id}/receive`);
    toast.success('Purchase received');
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Purchases</h2>
      <form className="panel space-y-3 rounded-lg p-4" onSubmit={save}>
        <div className="grid gap-3 md:grid-cols-5">
          <select className="input" value={form.supplier_id} onChange={(event) => setForm({ ...form, supplier_id: event.target.value })} required>
            <option value="">Supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
          <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="pending">Pending</option><option value="received">Received</option></select>
          <select className="input" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="mobile_wallet">Mobile wallet</option><option value="credit">Credit</option></select>
          <input className="input" type="number" placeholder="Amount paid" value={form.amount_paid} onChange={(event) => setForm({ ...form, amount_paid: event.target.value })} />
          <button className="btn-primary"><Plus size={16} /> Save purchase</button>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Find variant" value={query} onChange={(event) => setQuery(event.target.value)} onBlur={load} />
          </div>
          <select className="input" onChange={(event) => addRow(event.target.value)} value="">
            <option value="">Add product variant</option>
            {variants.map((variant) => <option key={variant.product_variant_id} value={variant.product_variant_id}>{variant.product_name} - {variant.variant_name}</option>)}
          </select>
        </div>
        {form.rows.map((row, index) => (
          <div key={`${row.product_variant_id}-${index}`} className="grid gap-2 md:grid-cols-[1fr_120px_140px]">
            <div className="input bg-slate-50">{row.title}</div>
            <input className="input" type="number" value={row.quantity} onChange={(event) => setForm({ ...form, rows: form.rows.map((item, rowIndex) => rowIndex === index ? { ...item, quantity: event.target.value } : item) })} />
            <input className="input" type="number" value={row.unit_cost} onChange={(event) => setForm({ ...form, rows: form.rows.map((item, rowIndex) => rowIndex === index ? { ...item, unit_cost: event.target.value } : item) })} />
          </div>
        ))}
      </form>
      <div className="panel rounded-lg p-4">
        <table className="min-w-full text-sm">
          <tbody>
            {items.map((purchase) => (
              <tr key={purchase.id} className="border-t border-slate-100">
                <td className="py-3">#{purchase.purchase_number || purchase.id} · {purchase.supplier_name}</td>
                <td>Rs {purchase.total_amount}</td>
                <td>{purchase.payment_status}</td>
                <td>{purchase.status}</td>
                <td className="text-right">{purchase.status !== 'received' && <button className="btn-secondary" onClick={() => receive(purchase.id)}>Receive stock</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
