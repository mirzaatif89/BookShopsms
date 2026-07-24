import { Minus, Plus, Printer, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function POS() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  async function searchBooks(value = query) {
    const { data } = await api.get('/books', { params: { search: value, limit: 20 } });
    setBooks(data.items);
  }

  useEffect(() => { searchBooks('').catch(() => {}); }, []);

  function add(book) {
    setCart((current) => {
      const found = current.find((item) => item.book_id === book.id);
      if (found) return current.map((item) => item.book_id === book.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { book_id: book.id, title: book.title, unit_price: Number(book.sale_price), quantity: 1 }];
    });
  }

  function changeQty(bookId, delta) {
    setCart((current) => current.map((item) => item.book_id === bookId ? { ...item, quantity: Math.max(item.quantity + delta, 1) } : item));
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [cart]);
  const total = Math.max(subtotal - Number(discount || 0), 0);

  async function checkout() {
    try {
      const { data } = await api.post('/sales', { items: cart, discount, payment_method: paymentMethod });
      toast.success('Sale completed');
      const invoice = await api.get(`/sales/${data.id}/invoice`, { responseType: 'blob' });
      window.open(URL.createObjectURL(invoice.data), '_blank');
      setCart([]);
      setDiscount(0);
      await searchBooks(query);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">POS Billing</h2>
        <form className="panel flex gap-3 rounded-lg p-4" onSubmit={(e) => { e.preventDefault(); searchBooks(); }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Scan barcode or search ISBN/title" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>
          <button className="btn-secondary">Search</button>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          {books.map((book) => (
            <button key={book.id} className="panel rounded-lg p-4 text-left hover:border-teal-500" onClick={() => add(book)} disabled={book.stock_quantity < 1}>
              <div className="font-medium">{book.title}</div>
              <div className="text-sm text-slate-500">{book.isbn} · Stock {book.stock_quantity}</div>
              <div className="mt-2 font-semibold">Rs {book.sale_price}</div>
            </button>
          ))}
        </div>
      </section>
      <aside className="panel h-fit rounded-lg p-4">
        <h3 className="mb-4 font-semibold">Cart</h3>
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.book_id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div><div className="font-medium">{item.title}</div><div className="text-sm text-slate-500">Rs {item.unit_price}</div></div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={() => changeQty(item.book_id, -1)}><Minus size={14} /></button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button className="btn-secondary" onClick={() => changeQty(item.book_id, 1)}><Plus size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <input className="input mt-4" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount" />
        <select className="input mt-3" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="easypaisa">Easypaisa</option>
          <option value="jazzcash">JazzCash</option>
        </select>
        <div className="my-4 text-right text-2xl font-semibold">Rs {total.toFixed(2)}</div>
        <button className="btn-primary w-full" onClick={checkout} disabled={!cart.length}><Printer size={18} /> Complete sale</button>
      </aside>
    </div>
  );
}
