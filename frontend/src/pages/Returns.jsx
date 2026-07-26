import React, { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function Returns() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/returns').then(({ data }) => setItems(data.items || [])).catch(() => {}); }, []);
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Returns</h2>
      <div className="panel rounded-lg p-4 text-sm text-slate-500">Create returns through `POST /api/returns` with original sale item IDs. Approved returns restock valid items automatically.</div>
      <div className="panel overflow-hidden rounded-lg">
        <table className="min-w-full text-left text-sm"><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{item.return_number}</td><td>{item.receipt_number}</td><td>Rs {item.refund_amount}</td><td>{item.refund_method}</td><td>{item.status}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
