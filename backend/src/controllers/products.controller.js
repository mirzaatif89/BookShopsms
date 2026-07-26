import { pool, transaction } from '../config/db.js';
import { AppError } from '../middleware/error.js';

const productFields = [
  'name',
  'product_code',
  'barcode',
  'category_id',
  'subcategory_id',
  'supplier_id',
  'brand',
  'description',
  'unit',
  'image_url',
  'status',
  'author',
  'publisher',
  'isbn',
  'subject',
  'class_level',
  'edition',
  'language',
  'color',
  'size',
  'pack_quantity',
  'material',
  'sport_type'
];

const variantFields = [
  'variant_name',
  'sku',
  'barcode',
  'purchase_price',
  'sale_price',
  'stock_quantity',
  'minimum_stock_level',
  'attributes',
  'status'
];

function paging(req) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

function normalizeVariant(variant) {
  return {
    variant_name: variant.variant_name,
    sku: variant.sku,
    barcode: variant.barcode || null,
    purchase_price: variant.purchase_price ?? 0,
    sale_price: variant.sale_price ?? 0,
    stock_quantity: variant.stock_quantity ?? 0,
    minimum_stock_level: variant.minimum_stock_level ?? 0,
    attributes: variant.attributes ? JSON.stringify(variant.attributes) : null,
    status: variant.status || 'active'
  };
}

export async function listProducts(req, res, next) {
  try {
    const { page, limit, offset } = paging(req);
    const filters = [];
    const params = [];

    if (req.query.search) {
      const q = `%${req.query.search}%`;
      filters.push('(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ?)');
      params.push(q, q, q, q, q);
    }
    if (req.query.category_id) {
      filters.push('p.category_id = ?');
      params.push(req.query.category_id);
    }
    if (req.query.subcategory_id) {
      filters.push('p.subcategory_id = ?');
      params.push(req.query.subcategory_id);
    }
    if (req.query.low_stock === 'true') {
      filters.push('v.stock_quantity <= v.minimum_stock_level');
    }
    if (req.query.status) {
      filters.push('p.status = ?');
      params.push(req.query.status);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [items] = await pool.query(
      `SELECT p.*,
              c.name AS category_name,
              sc.name AS subcategory_name,
              COUNT(v.id) AS variant_count,
              COALESCE(SUM(v.stock_quantity), 0) AS total_stock,
              MIN(v.sale_price) AS min_sale_price,
              MAX(v.sale_price) AS max_sale_price
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories sc ON sc.id = p.subcategory_id
       LEFT JOIN product_variants v ON v.product_id = p.id
       ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM products p
       LEFT JOIN product_variants v ON v.product_id = p.id
       ${where}`,
      params
    );
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
}

export async function listProductVariants(req, res, next) {
  try {
    const filters = ['p.status = "active"', 'v.status = "active"'];
    const params = [];
    if (req.query.search) {
      const q = `%${req.query.search}%`;
      filters.push('(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ? OR v.variant_name LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ? OR p.isbn LIKE ?)');
      params.push(q, q, q, q, q, q, q);
    }
    if (req.query.category_id) {
      filters.push('p.category_id = ?');
      params.push(req.query.category_id);
    }
    if (req.query.subcategory_id) {
      filters.push('p.subcategory_id = ?');
      params.push(req.query.subcategory_id);
    }
    const [items] = await pool.query(
      `SELECT v.id AS product_variant_id, v.product_id, v.variant_name, v.sku, v.barcode, v.purchase_price, v.sale_price,
              v.stock_quantity, v.minimum_stock_level, p.name AS product_name, p.product_code, p.brand,
              p.author, p.publisher, p.isbn, c.name AS category_name, sc.name AS subcategory_name
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories sc ON sc.id = p.subcategory_id
       WHERE ${filters.join(' AND ')}
       ORDER BY p.name, v.variant_name
       LIMIT 50`,
      params
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function listStockMovements(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT sm.*, CONCAT(p.name, ' - ', v.variant_name) AS product_name, u.name AS user_name
       FROM stock_movements sm
       LEFT JOIN product_variants v ON v.id = sm.product_variant_id
       LEFT JOIN products p ON p.id = v.product_id
       LEFT JOIN users u ON u.id = sm.user_id
       ORDER BY sm.created_at DESC LIMIT 200`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) throw new AppError('Product not found', 404);
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id = ? ORDER BY id', [req.params.id]);
    res.json({ ...product, variants });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const result = await transaction(async (conn) => {
      const values = productFields.map((field) => req.body[field] ?? null);
      const [product] = await conn.query(
        `INSERT INTO products (${productFields.join(',')}) VALUES (${productFields.map(() => '?').join(',')})`,
        values
      );

      const variants = req.body.variants?.length
        ? req.body.variants
        : [{ variant_name: req.body.name, sku: req.body.product_code || `P-${product.insertId}` }];

      for (const variant of variants.map(normalizeVariant)) {
        await conn.query(
          `INSERT INTO product_variants (product_id, ${variantFields.join(',')})
           VALUES (?, ${variantFields.map(() => '?').join(',')})`,
          [product.insertId, ...variantFields.map((field) => variant[field] ?? null)]
        );
      }
      return product.insertId;
    });

    res.status(201).json({ id: result });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const fields = productFields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (!fields.length) throw new AppError('No fields to update', 400);
    const [result] = await pool.query(
      `UPDATE products SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
      [...fields.map((field) => req.body[field]), req.params.id]
    );
    if (!result.affectedRows) throw new AppError('Product not found', 404);
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (error) {
    next(error);
  }
}

export async function adjustVariantStock(req, res, next) {
  try {
    const quantityChange = Number(req.body.quantity_change);
    const movementType = req.body.movement_type || 'adjusted';
    const result = await transaction(async (conn) => {
      const [[variant]] = await conn.query(
        'SELECT * FROM product_variants WHERE id = ? AND product_id = ? FOR UPDATE',
        [req.params.variantId, req.params.id]
      );
      if (!variant) throw new AppError('Product variant not found', 404);

      const previousQuantity = Number(variant.stock_quantity);
      const newQuantity = previousQuantity + quantityChange;
      if (newQuantity < 0) throw new AppError('Stock cannot go below zero', 409);

      await conn.query('UPDATE product_variants SET stock_quantity = ? WHERE id = ?', [newQuantity, req.params.variantId]);
      await conn.query(
        `INSERT INTO stock_movements
          (product_variant_id, movement_type, previous_quantity, quantity_change, new_quantity, reference_type, reason, user_id)
         VALUES (?, ?, ?, ?, ?, "manual_adjustment", ?, ?)`,
        [req.params.variantId, movementType, previousQuantity, quantityChange, newQuantity, req.body.reason || null, req.user.id]
      );

      return { id: Number(req.params.variantId), previous_quantity: previousQuantity, quantity_change: quantityChange, new_quantity: newQuantity };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
