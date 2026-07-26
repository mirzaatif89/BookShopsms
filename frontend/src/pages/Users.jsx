import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });

  async function load() {
    const [{ data: userData }, { data: roleData }] = await Promise.all([api.get('/users'), api.get('/users/roles')]);
    setUsers(userData.items || []);
    setRoles(roleData.items || []);
    setPermissions(roleData.permissions || []);
  }

  useEffect(() => { load().catch(() => toast.error('Failed to load users')); }, []);

  async function save(event) {
    event.preventDefault();
    await api.post('/users', form);
    toast.success('User added');
    setForm({ name: '', email: '', password: '', role: 'cashier' });
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Users and Roles</h2>
      <form className="panel grid gap-3 rounded-lg p-4 md:grid-cols-5" onSubmit={save}>
        <input className="input" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{['admin', 'manager', 'cashier', 'inventory_staff'].map((role) => <option key={role}>{role}</option>)}</select>
        <button className="btn-primary">Add user</button>
      </form>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel rounded-lg p-4"><h3 className="mb-3 font-semibold">Users</h3>{users.map((user) => <div key={user.id} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{user.name} ({user.email})</span><span>{user.role}</span></div>)}</section>
        <section className="panel rounded-lg p-4"><h3 className="mb-3 font-semibold">Role permissions</h3>{roles.map((role) => <div key={role.id} className="border-t border-slate-100 py-2 text-sm"><div className="font-medium">{role.name}</div><div className="text-slate-500">{role.permissions || 'No permissions'}</div></div>)}<p className="mt-3 text-xs text-slate-500">{permissions.length} permissions available.</p></section>
      </div>
    </div>
  );
}
