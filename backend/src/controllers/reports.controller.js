import { pool } from '../config/db.js';

export async function salesSummary(req, res, next) {
  try {
    const [daily] = await pool.query(
      `SELECT DATE(sale_date) AS period, SUM(total_amount) AS total, COUNT(*) AS orders
       FROM sales WHERE status NOT IN ('cancelled', 'held') AND sale_date >= CURDATE() - INTERVAL 30 DAY
       GROUP BY DATE(sale_date) ORDER BY period`
    );
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(sale_date, '%Y-%m') AS period, SUM(total_amount) AS total, COUNT(*) AS orders
       FROM sales WHERE status NOT IN ('cancelled', 'held')
       GROUP BY DATE_FORMAT(sale_date, '%Y-%m') ORDER BY period DESC LIMIT 12`
    );
    res.json({ daily, monthly });
  } catch (error) {
    next(error);
  }
}

export async function bestSellingBooks(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT COALESCE(si.product_variant_id, si.book_id) AS id,
              COALESCE(CONCAT(p.name, ' - ', v.variant_name), b.title) AS title,
              COALESCE(p.author, b.author, '') AS author,
              SUM(si.quantity) AS quantity_sold,
              SUM(si.subtotal) AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN books b ON b.id = si.book_id
       LEFT JOIN product_variants v ON v.id = si.product_variant_id
       LEFT JOIN products p ON p.id = v.product_id
       WHERE s.status NOT IN ('cancelled', 'held')
       GROUP BY COALESCE(si.product_variant_id, si.book_id), title, author
       ORDER BY quantity_sold DESC LIMIT 10`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function lowStock(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT v.id, CONCAT(p.name, ' - ', v.variant_name) AS title, COALESCE(v.barcode, v.sku) AS isbn,
              v.stock_quantity, v.minimum_stock_level AS reorder_level
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE v.stock_quantity <= v.minimum_stock_level
       UNION ALL
       SELECT id, title, isbn, stock_quantity, reorder_level
       FROM books
       WHERE stock_quantity <= reorder_level
       ORDER BY stock_quantity ASC`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function profitLoss(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT DATE(s.sale_date) AS period,
              SUM(si.subtotal) AS revenue,
              SUM(si.quantity * COALESCE(v.purchase_price, b.cost_price, 0)) AS cost,
              SUM(si.subtotal - (si.quantity * COALESCE(v.purchase_price, b.cost_price, 0))) AS gross_profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN books b ON b.id = si.book_id
       LEFT JOIN product_variants v ON v.id = si.product_variant_id
       WHERE s.status NOT IN ('cancelled', 'held')
       GROUP BY DATE(s.sale_date)
       ORDER BY period DESC LIMIT 30`
    );
    const [[valuation]] = await pool.query(
      `SELECT SUM(cost_value) AS cost_value, SUM(retail_value) AS retail_value
       FROM (
         SELECT SUM(stock_quantity * purchase_price) AS cost_value, SUM(stock_quantity * sale_price) AS retail_value FROM product_variants
         UNION ALL
         SELECT SUM(stock_quantity * cost_price) AS cost_value, SUM(stock_quantity * sale_price) AS retail_value FROM books
       ) values_union`
    );
    res.json({ items, stock_valuation: valuation });
  } catch (error) {
    next(error);
  }
}
