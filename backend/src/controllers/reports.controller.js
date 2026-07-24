import { pool } from '../config/db.js';

export async function salesSummary(req, res, next) {
  try {
    const [daily] = await pool.query(
      `SELECT DATE(sale_date) AS period, SUM(total_amount) AS total, COUNT(*) AS orders
       FROM sales WHERE status <> 'cancelled' AND sale_date >= CURDATE() - INTERVAL 30 DAY
       GROUP BY DATE(sale_date) ORDER BY period`
    );
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(sale_date, '%Y-%m') AS period, SUM(total_amount) AS total, COUNT(*) AS orders
       FROM sales WHERE status <> 'cancelled'
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
      `SELECT b.id, b.title, b.author, SUM(si.quantity) AS quantity_sold, SUM(si.subtotal) AS revenue
       FROM sale_items si JOIN books b ON b.id = si.book_id JOIN sales s ON s.id = si.sale_id
       WHERE s.status <> 'cancelled'
       GROUP BY b.id, b.title, b.author
       ORDER BY quantity_sold DESC LIMIT 10`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function lowStock(req, res, next) {
  try {
    const [items] = await pool.query('SELECT id, title, isbn, stock_quantity, reorder_level FROM books WHERE stock_quantity <= reorder_level ORDER BY stock_quantity ASC');
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
              SUM(si.quantity * b.cost_price) AS cost,
              SUM(si.subtotal - (si.quantity * b.cost_price)) AS gross_profit
       FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN books b ON b.id = si.book_id
       WHERE s.status <> 'cancelled'
       GROUP BY DATE(s.sale_date)
       ORDER BY period DESC LIMIT 30`
    );
    const [[valuation]] = await pool.query('SELECT SUM(stock_quantity * cost_price) AS cost_value, SUM(stock_quantity * sale_price) AS retail_value FROM books');
    res.json({ items, stock_valuation: valuation });
  } catch (error) {
    next(error);
  }
}
