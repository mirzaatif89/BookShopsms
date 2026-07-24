import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const emptyBook = {
  title: '',
  author: '',
  isbn: '',
  category_id: '',
  publisher: '',
  cost_price: 0,
  sale_price: 0,
  stock_quantity: 0,
  reorder_level: 5,
  image_url: ''
};

export default function Books() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category_id: '', low_stock: false });
  const [form, setForm] = useState(emptyBook);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const params = { search: filters.search || undefined, category_id: filters.category_id || undefined, low_stock: filters.low_stock || undefined, limit: 50 };
    const [{ data: bookData }, { data: categoryData }] = await Promise.all([api.get('/books', { params }), api.get('/categories', { params: { limit: 100 } })]);
    setBooks(bookData.items);
    setCategories(categoryData.items);
  }

  useEffect(() => {
    load().catch((error) => toast.error(error.response?.data?.message || 'Failed to load books'));
  }, []);

  async function applyFilters(event) {
    event?.preventDefault();
    await load();
  }

  async function save(event) {
    event.preventDefault();
    const payload = { ...form, category_id: form.category_id || null };
    try {
      if (editingId) {
        await api.put(`/books/${editingId}`, payload);
        toast.success('Book updated');
      } else {
        await api.post('/books', payload);
        toast.success('Book added');
      }
      setForm(emptyBook);
      setEditingId(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed');
    }
  }

  function edit(book) {
    setEditingId(book.id);
    setForm({ ...emptyBook, ...book, category_id: book.category_id || '' });
  }

  async function remove(id) {
    if (!confirm('Delete this book?')) return;
    try {
      await api.delete(`/books/${id}`);
      toast.success('Book deleted');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Books Inventory</h2>
        <p className="text-sm text-slate-500">Manage stock, pricing, categories, and ISBN lookup.</p>
      </div>

      <form onSubmit={applyFilters} className="panel flex flex-col gap-3 rounded-lg p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search title, author, or ISBN" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <select className="input md:w-56" value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.low_stock} onChange={(e) => setFilters({ ...filters, low_stock: e.target.checked })} />
          Low stock
        </label>
        <button className="btn-secondary" type="submit">Apply</button>
      </form>

      <form onSubmit={save} className="panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus size={18} />
          <h3 className="font-semibold">{editingId ? 'Edit book' : 'Add book'}</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {['title', 'author', 'isbn', 'publisher'].map((field) => (
            <input key={field} className="input" placeholder={field.replace('_', ' ')} value={form[field] || ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={['title', 'author', 'isbn'].includes(field)} />
          ))}
          <select className="input" value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">No category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {['cost_price', 'sale_price', 'stock_quantity', 'reorder_level'].map((field) => (
            <input key={field} className="input" type="number" step={field.includes('price') ? '0.01' : '1'} placeholder={field.replace('_', ' ')} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
          ))}
          <input className="input md:col-span-3" placeholder="Image URL" value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" type="submit">{editingId ? 'Update book' : 'Add book'}</button>
          {editingId && <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyBook); }}>Cancel</button>}
        </div>
      </form>

      <div className="panel overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">ISBN</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className={book.stock_quantity <= book.reorder_level ? 'bg-rose-50' : 'border-t border-slate-100'}>
                  <td className="px-4 py-3"><div className="font-medium">{book.title}</div><div className="text-slate-500">{book.author}</div></td>
                  <td className="px-4 py-3">{book.isbn}</td>
                  <td className="px-4 py-3">{book.category_name || '-'}</td>
                  <td className="px-4 py-3">Rs {book.sale_price}</td>
                  <td className="px-4 py-3">{book.stock_quantity} / reorder {book.reorder_level}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary" type="button" onClick={() => edit(book)}><Edit size={16} /></button>
                      <button className="btn-secondary" type="button" onClick={() => remove(book.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!books.length && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="6">No books found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
