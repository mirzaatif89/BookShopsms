import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Purchases() {
  const [items, setItems] = useState([]);

  async function load() {
    const { data } = await api.get('/purchases');
    setItems(data.items);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load purchases')); }, []);

  async function receive(id) {
    await api.post(`/purchases/${id}/receive`);
    toast.success('Purchase received');
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Purchases</h2>
      <div className="panel rounded-lg p-4">
        <p className="mb-4 text-sm text-slate-500">Create purchase orders through the API at POST /api/purchases; this page lists and receives them.</p>
        <table className="min-w-full text-sm">
          <tbody>
            {items.map((purchase) => (
              <tr key={purchase.id} className="border-t border-slate-100">
                <td className="py-3">#{purchase.id} · {purchase.supplier_name}</td>
                <td>Rs {purchase.total_amount}</td>
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
