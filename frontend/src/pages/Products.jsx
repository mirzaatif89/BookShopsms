import { Edit, PackagePlus, Search, SlidersHorizontal } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const emptyProduct = {
  name: '',
  product_code: '',
  barcode: '',
  category_id: '',
  subcategory_id: '',
  supplier_id: '',
  brand: '',
  unit: 'piece',
  description: '',
  author: '',
  publisher: '',
  isbn: '',
  subject: '',
  class_level: '',
  edition: '',
  language: '',
  color: '',
  size: '',
  pack_quantity: '',
  material: '',
  sport_type: '',
  variant_name: '',
  sku: '',
  variant_barcode: '',
  purchase_price: 0,
  sale_price: 0,
  stock_quantity: 0,
  minimum_stock_level: 5
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ search: '', category_id: '', low_stock: false });
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);

  const mainCategories = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);
  const subcategories = useMemo(() => categories.filter((category) => Number(category.parent_id) === Number(form.category_id)), [categories, form.category_id]);

  async function load() {
    const params = { search: filters.search || undefined, category_id: filters.category_id || undefined, low_stock: filters.low_stock || undefined, limit: 80 };
    const [{ data: productData }, { data: categoryData }, { data: supplierData }] = await Promise.all([
      api.get('/products', { params }),
      api.get('/categories', { params: { limit: 100 } }),
      api.get('/suppliers', { params: { limit: 100 } }).catch(() => ({ data: { items: [] } }))
    ]);
    setProducts(productData.items || []);
    setCategories(categoryData.items || []);
    setSuppliers(supplierData.items || []);
  }

  useEffect(() => { load().catch((error) => toast.error(error.response?.data?.message || 'Failed to load products')); }, []);

  async function save(event) {
    event.preventDefault();
    const payload = {
      ...form,
      category_id: form.category_id || null,
      subcategory_id: form.subcategory_id || null,
      supplier_id: form.supplier_id || null
    };
    if (!editingId) {
      payload.variants = [{
        variant_name: form.variant_name || form.name,
        sku: form.sku || form.product_code,
        barcode: form.variant_barcode || form.barcode || null,
        purchase_price: Number(form.purchase_price || 0),
        sale_price: Number(form.sale_price || 0),
        stock_quantity: Number(form.stock_quantity || 0),
        minimum_stock_level: Number(form.minimum_stock_level || 0),
        attributes: { color: form.color, size: form.size, pack_quantity: form.pack_quantity }
      }];
    }
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product added');
      }
      setEditingId(null);
      setForm(emptyProduct);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed');
    }
  }

  function edit(product) {
    setEditingId(product.id);
    setForm({ ...emptyProduct, ...product, category_id: product.category_id || '', subcategory_id: product.subcategory_id || '', supplier_id: product.supplier_id || '' });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Products</h2>
        <p className="text-sm text-slate-500">Books, stationery, gifts, sports items, and sellable variants.</p>
      </div>

      <form className="panel flex flex-col gap-3 rounded-lg p-4 md:flex-row" onSubmit={(event) => { event.preventDefault(); load(); }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search name, SKU, barcode, ISBN" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        </div>
        <select className="input md:w-56" value={filters.category_id} onChange={(event) => setFilters({ ...filters, category_id: event.target.value })}>
          <option value="">All categories</option>
          {mainCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.low_stock} onChange={(event) => setFilters({ ...filters, low_stock: event.target.checked })} />
          Low stock
        </label>
        <button className="btn-secondary"><SlidersHorizontal size={16} /> Apply</button>
      </form>

      <form className="panel rounded-lg p-4" onSubmit={save}>
        <div className="mb-3 flex items-center gap-2">
          <PackagePlus size={18} />
          <h3 className="font-semibold">{editingId ? 'Edit product' : 'Add product and first variant'}</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="input" placeholder="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="input" placeholder="Product code" value={form.product_code || ''} onChange={(event) => setForm({ ...form, product_code: event.target.value })} />
          <input className="input" placeholder="Barcode" value={form.barcode || ''} onChange={(event) => setForm({ ...form, barcode: event.target.value })} />
          <input className="input" placeholder="Brand" value={form.brand || ''} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          <select className="input" value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value, subcategory_id: '' })}>
            <option value="">Main category</option>
            {mainCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select className="input" value={form.subcategory_id} onChange={(event) => setForm({ ...form, subcategory_id: event.target.value })}>
            <option value="">Subcategory</option>
            {subcategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select className="input" value={form.supplier_id} onChange={(event) => setForm({ ...form, supplier_id: event.target.value })}>
            <option value="">Supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
          <input className="input" placeholder="Unit" value={form.unit || ''} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
          {['author', 'publisher', 'isbn', 'subject', 'class_level', 'edition', 'language', 'color', 'size', 'pack_quantity', 'material', 'sport_type'].map((field) => (
            <input key={field} className="input" placeholder={field.replace('_', ' ')} value={form[field] || ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
          ))}
          {!editingId && (
            <>
              <input className="input" placeholder="Variant name" value={form.variant_name || ''} onChange={(event) => setForm({ ...form, variant_name: event.target.value })} />
              <input className="input" placeholder="SKU" value={form.sku || ''} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
              <input className="input" placeholder="Variant barcode" value={form.variant_barcode || ''} onChange={(event) => setForm({ ...form, variant_barcode: event.target.value })} />
              {['purchase_price', 'sale_price', 'stock_quantity', 'minimum_stock_level'].map((field) => (
                <input key={field} className="input" type="number" step={field.includes('price') ? '0.01' : '1'} placeholder={field.replace('_', ' ')} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
              ))}
            </>
          )}
          <textarea className="input md:col-span-4" placeholder="Description" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary">{editingId ? 'Update product' : 'Add product'}</button>
          {editingId && <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyProduct); }}>Cancel</button>}
        </div>
      </form>

      <div className="panel overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Price range</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className={Number(product.total_stock) <= 0 ? 'bg-rose-50' : 'border-t border-slate-100'}>
                  <td className="px-4 py-3"><div className="font-medium">{product.name}</div><div className="text-slate-500">{product.product_code || product.barcode || product.isbn || '-'}</div></td>
                  <td className="px-4 py-3">{product.category_name || '-'}{product.subcategory_name ? ` / ${product.subcategory_name}` : ''}</td>
                  <td className="px-4 py-3">{product.variant_count}</td>
                  <td className="px-4 py-3">{product.total_stock}</td>
                  <td className="px-4 py-3">Rs {product.min_sale_price || 0} - {product.max_sale_price || 0}</td>
                  <td className="px-4 py-3 text-right"><button className="btn-secondary" type="button" onClick={() => edit(product)}><Edit size={16} /></button></td>
                </tr>
              ))}
              {!products.length && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="6">No products found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
