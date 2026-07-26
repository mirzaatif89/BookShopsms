import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Settings() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setSettings(data)).catch(() => toast.error('Failed to load settings'));
  }, []);

  function update(section, field, value) {
    setSettings((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  }

  async function save(event) {
    event.preventDefault();
    const { data } = await api.put('/settings', settings);
    setSettings(data);
    toast.success('Settings saved');
  }

  if (!settings) return <div className="panel rounded-lg p-4">Loading settings...</div>;

  return (
    <form className="space-y-5" onSubmit={save}>
      <h2 className="text-2xl font-semibold">Settings</h2>
      <Section title="Shop">
        {['name', 'logo_url', 'address', 'phone', 'currency', 'date_format'].map((field) => <Input key={field} label={field} value={settings.shop?.[field]} onChange={(value) => update('shop', field, value)} />)}
      </Section>
      <Section title="Sales">
        <Input label="default_discount" type="number" value={settings.sales?.default_discount} onChange={(value) => update('sales', 'default_discount', Number(value))} />
        <label className="text-sm"><span className="mb-1 block text-slate-500">discount_type</span><select className="input" value={settings.sales?.discount_type} onChange={(event) => update('sales', 'discount_type', event.target.value)}><option value="fixed">Fixed</option><option value="percentage">Percentage</option></select></label>
        <Input label="default_tax_rate" type="number" value={settings.sales?.default_tax_rate} onChange={(value) => update('sales', 'default_tax_rate', Number(value))} />
        <Input label="max_cashier_discount_percent" type="number" value={settings.sales?.max_cashier_discount_percent} onChange={(value) => update('sales', 'max_cashier_discount_percent', Number(value))} />
        <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(settings.sales?.allow_negative_stock)} onChange={(event) => update('sales', 'allow_negative_stock', event.target.checked)} /> Allow negative stock</label>
      </Section>
      <Section title="Receipt">
        {['footer', 'return_policy', 'format'].map((field) => <Input key={field} label={field} value={settings.receipt?.[field]} onChange={(value) => update('receipt', field, value)} />)}
      </Section>
      <button className="btn-primary">Save settings</button>
    </form>
  );
}

function Section({ title, children }) {
  return <section className="panel rounded-lg p-4"><h3 className="mb-3 font-semibold">{title}</h3><div className="grid gap-3 md:grid-cols-3">{children}</div></section>;
}

function Input({ label, value, onChange, type = 'text' }) {
  return <label className="text-sm"><span className="mb-1 block text-slate-500">{label.replaceAll('_', ' ')}</span><input className="input" type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} /></label>;
}
