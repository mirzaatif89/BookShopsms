import { Minus, Plus, Printer, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function POS() {
  const [query, setQuery] = useState('');
  const [variants, setVariants] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState(0);

  async function searchProducts(value = query) {
    const { data } = await api.get('/products/variants/search', { params: { search: value } });
    setVariants(data.items || []);
  }

  useEffect(() => {
    Promise.all([searchProducts(''), api.get('/settings')])
      .then(([, settings]) => {
        setDiscount(settings.data.sales?.default_discount || 0);
        setDiscountType(settings.data.sales?.discount_type || 'fixed');
        setTaxRate(settings.data.sales?.default_tax_rate || 0);
      })
      .catch(() => {});
  }, []);

  function add(variant) {
    setCart((current) => {
      const found = current.find((item) => item.product_variant_id === variant.product_variant_id);
      if (found) return current.map((item) => item.product_variant_id === variant.product_variant_id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { product_variant_id: variant.product_variant_id, title: `${variant.product_name} - ${variant.variant_name}`, unit_price: Number(variant.sale_price), stock_quantity: Number(variant.stock_quantity), quantity: 1 }];
    });
  }

  function changeQty(variantId, delta) {
    setCart((current) => current.map((item) => item.product_variant_id === variantId ? { ...item, quantity: Math.max(item.quantity + delta, 1) } : item));
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [cart]);
  const discountAmount = discountType === 'percentage' ? subtotal * (Number(discount || 0) / 100) : Number(discount || 0);
  const taxAmount = Math.max(subtotal - discountAmount, 0) * (Number(taxRate || 0) / 100);
  const total = Math.max(subtotal - discountAmount + taxAmount, 0);
  const change = Math.max(Number(amountReceived || 0) - total, 0);

  async function checkout(status = 'completed') {
    try {
      const { data } = await api.post('/sales', { items: cart, discount, discount_type: discountType, tax_rate: taxRate, payment_method: paymentMethod, amount_received: amountReceived || total, status });
      toast.success(status === 'held' ? 'Sale held' : 'Sale completed');
      if (status !== 'held') {
        const invoice = await api.get(`/sales/${data.id}/invoice`, { responseType: 'blob' });
        window.open(URL.createObjectURL(invoice.data), '_blank');
      }
      setCart([]);
      setAmountReceived(0);
      await searchProducts(query);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">POS Billing</h2>
        <form className="panel flex gap-3 rounded-lg p-4" onSubmit={(event) => { event.preventDefault(); searchProducts(); }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Scan barcode or search product, SKU, ISBN" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
          </div>
          <button className="btn-secondary">Search</button>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          {variants.map((variant) => (
            <button key={variant.product_variant_id} className="panel rounded-lg p-4 text-left hover:border-teal-500" onClick={() => add(variant)} disabled={variant.stock_quantity < 1}>
              <div className="font-medium">{variant.product_name} - {variant.variant_name}</div>
              <div className="text-sm text-slate-500">{variant.sku || variant.barcode || variant.isbn || '-'} · Stock {variant.stock_quantity}</div>
              <div className="mt-2 font-semibold">Rs {variant.sale_price}</div>
            </button>
          ))}
          {!variants.length && <div className="panel rounded-lg p-6 text-sm text-slate-500">No matching products.</div>}
        </div>
      </section>
      <aside className="panel h-fit rounded-lg p-4">
        <h3 className="mb-4 font-semibold">Cart</h3>
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.product_variant_id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div><div className="font-medium">{item.title}</div><div className="text-sm text-slate-500">Rs {item.unit_price} · Stock {item.stock_quantity}</div></div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={() => changeQty(item.product_variant_id, -1)} type="button"><Minus size={14} /></button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button className="btn-secondary" onClick={() => changeQty(item.product_variant_id, 1)} type="button"><Plus size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-[1fr_130px] gap-2">
          <input className="input" type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="Discount" />
          <select className="input" value={discountType} onChange={(event) => setDiscountType(event.target.value)}><option value="fixed">Fixed</option><option value="percentage">Percent</option></select>
        </div>
        <input className="input mt-3" type="number" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} placeholder="Tax %" />
        <select className="input mt-3" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="mobile_wallet">Mobile wallet</option>
          <option value="credit">Credit sale</option>
          <option value="split">Split payment</option>
        </select>
        <input className="input mt-3" type="number" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} placeholder="Amount received" />
        <div className="my-4 space-y-1 text-right">
          <div className="text-sm text-slate-500">Subtotal Rs {subtotal.toFixed(2)} · Discount Rs {discountAmount.toFixed(2)} · Tax Rs {taxAmount.toFixed(2)}</div>
          <div className="text-2xl font-semibold">Rs {total.toFixed(2)}</div>
          <div className="text-sm text-slate-500">Change Rs {change.toFixed(2)}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary w-full" onClick={() => checkout('held')} disabled={!cart.length} type="button">Hold</button>
          <button className="btn-primary w-full" onClick={() => checkout('completed')} disabled={!cart.length} type="button"><Printer size={18} /> Complete</button>
        </div>
      </aside>
    </div>
  );
}
