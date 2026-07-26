import PDFDocument from 'pdfkit';
import { pool, transaction } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { sendWhatsAppMessage } from '../services/notification.service.js';
import { getSettings } from '../services/settings.service.js';
import { writeAudit } from '../services/audit.service.js';

export async function listSales(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT s.*, COALESCE(s.receipt_number, CONCAT('R-', s.id)) AS display_receipt_number,
              c.name AS customer_name, u.name AS cashier_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       JOIN users u ON u.id = s.cashier_id
       ORDER BY s.sale_date DESC LIMIT 100`
    );
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createSale(req, res, next) {
  try {
    const {
      customer_id = null,
      items,
      discount = null,
      discount_type = null,
      tax_rate = null,
      payment_method = 'cash',
      amount_received = 0,
      amount_paid = null,
      status = 'completed',
      notes = null
    } = req.body;
    const sale = await transaction(async (conn) => {
      const settings = await getSettings(conn);
      const saleSettings = settings.sales || {};
      const effectiveDiscountType = discount_type || saleSettings.discount_type || 'fixed';
      const effectiveDiscountValue = Number(discount ?? saleSettings.default_discount ?? 0);
      const effectiveTaxRate = Number(tax_rate ?? saleSettings.default_tax_rate ?? 0);
      const allowNegativeStock = Boolean(saleSettings.allow_negative_stock);
      const variantIds = items.filter((item) => item.product_variant_id).map((item) => Number(item.product_variant_id));
      const bookIds = items.filter((item) => item.book_id).map((item) => Number(item.book_id));
      const variants = variantIds.length
        ? (await conn.query(
            `SELECT v.*, p.name AS product_name
             FROM product_variants v
             JOIN products p ON p.id = v.product_id
             WHERE v.id IN (${variantIds.map(() => '?').join(',')}) FOR UPDATE`,
            variantIds
          ))[0]
        : [];
      const books = bookIds.length
        ? (await conn.query(`SELECT * FROM books WHERE id IN (${bookIds.map(() => '?').join(',')}) FOR UPDATE`, bookIds))[0]
        : [];
      const variantsById = new Map(variants.map((variant) => [Number(variant.id), variant]));
      const booksById = new Map(books.map((book) => [Number(book.id), book]));
      let gross = 0;
      const normalized = items.map((item) => {
        const quantity = Number(item.quantity);
        const lineDiscount = Number(item.discount || 0);
        if (!item.product_variant_id && !item.book_id) throw new AppError('Each sale item needs a book_id or product_variant_id', 400);
        if (item.product_variant_id) {
          const variant = variantsById.get(Number(item.product_variant_id));
          if (!variant) throw new AppError(`Product variant not found: ${item.product_variant_id}`, 404);
          if (!allowNegativeStock && Number(variant.stock_quantity) < quantity) throw new AppError(`Insufficient stock for ${variant.product_name} - ${variant.variant_name}`, 409);
          const unitPrice = Number(item.unit_price ?? variant.sale_price);
          const subtotal = Math.max(unitPrice * quantity - lineDiscount, 0);
          gross += subtotal;
          return {
            product_variant_id: variant.id,
            book_id: null,
            title: `${variant.product_name} - ${variant.variant_name}`,
            stock_quantity: Number(variant.stock_quantity),
            unit_price: unitPrice,
            quantity,
            discount: lineDiscount,
            subtotal
          };
        }

        const book = booksById.get(Number(item.book_id));
        if (!book) throw new AppError(`Book not found: ${item.book_id}`, 404);
        if (!allowNegativeStock && Number(book.stock_quantity) < quantity) throw new AppError(`Insufficient stock for ${book.title}`, 409);
        const unitPrice = Number(item.unit_price ?? book.sale_price);
        const subtotal = Math.max(unitPrice * quantity - lineDiscount, 0);
        gross += subtotal;
        return { book_id: book.id, product_variant_id: null, title: book.title, stock_quantity: Number(book.stock_quantity), unit_price: unitPrice, quantity, discount: lineDiscount, subtotal };
      });

      const receiptDiscount = effectiveDiscountType === 'percentage' ? gross * (effectiveDiscountValue / 100) : effectiveDiscountValue;
      if (req.user.role === 'cashier' && effectiveDiscountType === 'percentage' && effectiveDiscountValue > Number(saleSettings.max_cashier_discount_percent || 0)) {
        throw new AppError('Discount exceeds cashier limit', 403);
      }
      const taxable = Math.max(gross - receiptDiscount, 0);
      const taxAmount = taxable * (effectiveTaxRate / 100);
      const total = Math.max(taxable + taxAmount, 0);
      const paid = Number(amount_paid ?? (payment_method === 'credit' ? 0 : total));
      const received = Number(amount_received || paid);
      const changeDue = payment_method === 'cash' ? Math.max(received - total, 0) : 0;
      const paymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
      const saleStatus = status === 'held' ? 'held' : payment_method === 'credit' && paid < total ? 'credit' : status;
      const receiptNumber = `RCPT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-6)}`;
      const [saleResult] = await conn.query(
        `INSERT INTO sales
          (receipt_number, customer_id, cashier_id, subtotal, total_amount, discount, discount_type, tax_amount, amount_paid, amount_received, change_due, payment_method, payment_status, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [receiptNumber, customer_id, req.user.id, gross, total, receiptDiscount, effectiveDiscountType, taxAmount, paid, received, changeDue, payment_method, paymentStatus, saleStatus, notes]
      );
      for (const item of normalized) {
        await conn.query('INSERT INTO sale_items (sale_id, book_id, product_variant_id, quantity, unit_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          saleResult.insertId,
          item.book_id,
          item.product_variant_id,
          item.quantity,
          item.unit_price,
          item.discount,
          item.subtotal
        ]);
        if (saleStatus !== 'held' && item.product_variant_id) {
          const previous = item.stock_quantity;
          const nextQty = previous - item.quantity;
          await conn.query('UPDATE product_variants SET stock_quantity = ? WHERE id = ?', [nextQty, item.product_variant_id]);
          await conn.query(
            `INSERT INTO stock_movements (product_variant_id, movement_type, previous_quantity, quantity_change, new_quantity, reference_type, reference_id, user_id)
             VALUES (?, 'sold', ?, ?, ?, 'sale', ?, ?)`,
            [item.product_variant_id, previous, -item.quantity, nextQty, saleResult.insertId, req.user.id]
          );
        } else if (saleStatus !== 'held' && item.book_id) {
          await conn.query('UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.book_id]);
          await conn.query('INSERT INTO stock_logs (book_id, change_type, quantity, reference_id) VALUES (?, "out", ?, ?)', [
            item.book_id,
            item.quantity,
            saleResult.insertId
          ]);
        }
      }
      if (saleStatus !== 'held' && paid > 0) {
        await conn.query(
          `INSERT INTO payments (sale_id, customer_id, direction, payment_method, amount, created_by)
           VALUES (?, ?, 'in', ?, ?, ?)`,
          [saleResult.insertId, customer_id, payment_method, paid, req.user.id]
        );
      }
      if ((saleStatus === 'credit' || paymentStatus !== 'paid') && customer_id) {
        await conn.query('UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?', [total - paid, customer_id]);
      }
      await writeAudit(conn, {
        userId: req.user.id,
        action: saleStatus === 'held' ? 'sale.hold' : 'sale.create',
        entityType: 'sale',
        entityId: saleResult.insertId,
        newValue: { receipt_number: receiptNumber, total_amount: total, items: normalized },
        ipAddress: req.ip
      });
      return { id: saleResult.insertId, receipt_number: receiptNumber, subtotal: gross, total_amount: total, discount: receiptDiscount, tax_amount: taxAmount, amount_paid: paid, amount_received: received, change_due: changeDue, payment_method, items: normalized };
    });

    const [lowStock] = await pool.query(
      `SELECT CONCAT(p.name, ' - ', v.variant_name) AS title, v.stock_quantity
       FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE v.stock_quantity <= v.minimum_stock_level
       UNION ALL
       SELECT title, stock_quantity FROM books WHERE stock_quantity <= reorder_level`
    );
    if (lowStock.length) {
      await sendWhatsAppMessage(process.env.ADMIN_WHATSAPP_NUMBER, `Low stock alert: ${lowStock.map((b) => `${b.title} (${b.stock_quantity})`).join(', ')}`);
    }
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
}

export async function saleInvoice(req, res, next) {
  try {
    const [[sale]] = await pool.query(
      `SELECT s.*, COALESCE(s.receipt_number, CONCAT('R-', s.id)) AS display_receipt_number,
              c.name AS customer_name, u.name AS cashier_name
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id JOIN users u ON u.id = s.cashier_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!sale) throw new AppError('Sale not found', 404);
    const [items] = await pool.query(
      `SELECT si.*, COALESCE(b.title, CONCAT(p.name, ' - ', v.variant_name)) AS title
       FROM sale_items si
       LEFT JOIN books b ON b.id = si.book_id
       LEFT JOIN product_variants v ON v.id = si.product_variant_id
       LEFT JOIN products p ON p.id = v.product_id
       WHERE si.sale_id = ?`,
      [req.params.id]
    );
    const settings = await getSettings();
    const shop = settings.shop || {};
    const receipt = settings.receipt || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=receipt-${sale.id}.pdf`);
    const doc = new PDFDocument({ margin: 48 });
    doc.pipe(res);
    doc.fontSize(20).text(shop.name || 'Bookshop');
    if (shop.address) doc.fontSize(9).text(shop.address);
    if (shop.phone) doc.fontSize(9).text(`Phone: ${shop.phone}`);
    doc.moveDown().fontSize(10).text(`Receipt #: ${sale.display_receipt_number}`).text(`Date: ${sale.sale_date}`).text(`Cashier: ${sale.cashier_name}`);
    doc.text(`Customer: ${sale.customer_name || 'Walk-in'}`).moveDown();
    items.forEach((item) => doc.text(`${item.title} x ${item.quantity} @ ${item.unit_price} = ${item.subtotal}`));
    doc.moveDown().text(`Subtotal: ${sale.subtotal}`).text(`Discount: ${sale.discount}`).text(`Tax: ${sale.tax_amount}`).fontSize(14).text(`Total: ${sale.total_amount}`);
    doc.fontSize(10).text(`Paid: ${sale.amount_paid}`).text(`Received: ${sale.amount_received}`).text(`Change: ${sale.change_due}`).text(`Payment: ${sale.payment_method}`);
    if (receipt.return_policy) doc.moveDown().fontSize(9).text(receipt.return_policy);
    if (receipt.footer) doc.fontSize(9).text(receipt.footer);
    doc.end();
  } catch (error) {
    next(error);
  }
}
