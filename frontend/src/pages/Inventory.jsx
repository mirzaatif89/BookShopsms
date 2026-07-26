import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Inventory() {
  const [variants, setVariants] = useState([]);
  const [movements, setMovements] = useState([]);
  const [query, setQuery] = useState('');
  const [adjust, setAdjust] = useState({ product_id: '', product_variant_id: '', quantity_change: 0, movement_type: 'adjusted', reason: '' });

  async function load() {
    const [{ data: variantData }, { data: movementData }] = await Promise.all([
      api.get('/products/variants/search', { params: { search: query } }),
      api.get('/products/stock-movements')
    ]);
    setVariants(variantData.items || []);
    setMovements(movementData.items || []);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load inventory')); }, []);

  async function save(event) {
    event.preventDefault();
    const variant = variants.find((item) => Number(item.product_variant_id) === Number(adjust.product_variant_id));
    await api.post(`/products/${variant.product_id}/variants/${variant.product_variant_id}/adjust`, adjust);
    toast.success('Stock adjusted');
    setAdjust({ product_id: '', product_variant_id: '', quantity_change: 0, movement_type: 'adjusted', reason: '' });
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Inventory</h2>
      <form className="panel grid gap-3 rounded-lg p-4 md:grid-cols-5" onSubmit={save}>
        <input className="input" placeholder="Search products" value={query} onChange={(event) => setQuery(event.target.value)} onBlur={load} />
        <select className="input md:col-span-2" value={adjust.product_variant_id} onChange={(event) => setAdjust({ ...adjust, product_variant_id: event.target.value })} required>
          <option value="">Select variant</option>
          {variants.map((item) => <option key={item.product_variant_id} value={item.product_variant_id}>{item.product_name} - {item.variant_name} ({item.stock_quantity})</option>)}
        </select>
        <input className="input" type="number" placeholder="Qty change" value={adjust.quantity_change} onChange={(event) => setAdjust({ ...adjust, quantity_change: event.target.value })} required />
        <select className="input" value={adjust.movement_type} onChange={(event) => setAdjust({ ...adjust, movement_type: event.target.value })}>
          <option value="adjusted">Adjusted</option>
          <option value="damaged">Damaged</option>
          <option value="returned">Returned</option>
          <option value="received">Received</option>
        </select>
        <input className="input md:col-span-4" placeholder="Reason" value={adjust.reason} onChange={(event) => setAdjust({ ...adjust, reason: event.target.value })} />
        <button className="btn-primary">Save adjustment</button>
      </form>
      <div className="panel overflow-hidden rounded-lg">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Product</th><th>Type</th><th>Previous</th><th>Change</th><th>New</th><th>Date</th></tr></thead>
          <tbody>{movements.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{item.product_name || `Book #${item.book_id}`}</td><td>{item.movement_type}</td><td>{item.previous_quantity}</td><td>{item.quantity_change}</td><td>{item.new_quantity}</td><td>{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
