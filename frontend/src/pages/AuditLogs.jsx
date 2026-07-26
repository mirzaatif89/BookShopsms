import React, { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function AuditLogs() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/audit-logs').then(({ data }) => setItems(data.items || [])).catch(() => {}); }, []);
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Audit Logs</h2>
      <div className="panel overflow-hidden rounded-lg">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Date</th><th>User</th><th>Action</th><th>Record</th><th>IP</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{new Date(item.created_at).toLocaleString()}</td><td>{item.user_name || '-'}</td><td>{item.action}</td><td>{item.entity_type} #{item.entity_id || '-'}</td><td>{item.ip_address || '-'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
