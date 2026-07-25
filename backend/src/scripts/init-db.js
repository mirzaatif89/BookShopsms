import '../config/env.js';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bookshop_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

async function createSchema(pool) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_categories_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(191) NOT NULL,
      contact_number VARCHAR(50) NULL,
      address TEXT NULL,
      email VARCHAR(191) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS customers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(191) NOT NULL,
      phone VARCHAR(50) NULL,
      email VARCHAR(191) NULL,
      address TEXT NULL,
      credit_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS books (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(191) NOT NULL,
      author VARCHAR(191) NOT NULL,
      isbn VARCHAR(50) NOT NULL,
      category_id BIGINT UNSIGNED NULL,
      publisher VARCHAR(191) NULL,
      cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      sale_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      stock_quantity INT NOT NULL DEFAULT 0,
      reorder_level INT NOT NULL DEFAULT 5,
      image_url TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_books_isbn (isbn),
      KEY idx_books_category_id (category_id),
      CONSTRAINT fk_books_category
        FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_id BIGINT UNSIGNED NULL,
      cashier_id BIGINT UNSIGNED NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      payment_method ENUM('cash', 'easypaisa', 'jazzcash') NOT NULL DEFAULT 'cash',
      status ENUM('paid', 'credit', 'cancelled') NOT NULL DEFAULT 'paid',
      sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_sales_customer_id (customer_id),
      KEY idx_sales_cashier_id (cashier_id),
      CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
      CONSTRAINT fk_sales_cashier
        FOREIGN KEY (cashier_id) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sale_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sale_id BIGINT UNSIGNED NOT NULL,
      book_id BIGINT UNSIGNED NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_sale_items_sale_id (sale_id),
      KEY idx_sale_items_book_id (book_id),
      CONSTRAINT fk_sale_items_sale
        FOREIGN KEY (sale_id) REFERENCES sales (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT fk_sale_items_book
        FOREIGN KEY (book_id) REFERENCES books (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS purchases (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      supplier_id BIGINT UNSIGNED NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      status ENUM('pending', 'received') NOT NULL DEFAULT 'pending',
      purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_purchases_supplier_id (supplier_id),
      CONSTRAINT fk_purchases_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS purchase_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      purchase_id BIGINT UNSIGNED NOT NULL,
      book_id BIGINT UNSIGNED NOT NULL,
      quantity INT NOT NULL,
      unit_cost DECIMAL(12,2) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_purchase_items_purchase_id (purchase_id),
      KEY idx_purchase_items_book_id (book_id),
      CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT fk_purchase_items_book
        FOREIGN KEY (book_id) REFERENCES books (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS stock_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      book_id BIGINT UNSIGNED NOT NULL,
      change_type ENUM('in', 'out') NOT NULL,
      quantity INT NOT NULL,
      reference_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_stock_logs_book_id (book_id),
      CONSTRAINT fk_stock_logs_book
        FOREIGN KEY (book_id) REFERENCES books (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function getId(pool, table, column, value) {
  const [rows] = await pool.query(`SELECT id FROM ${table} WHERE ${column} = ? LIMIT 1`, [value]);
  return rows[0]?.id ?? null;
}

async function seedAdmin(pool) {
  const email = 'admin@admin.com';
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length) return existing[0].id;

  const passwordHash = await bcrypt.hash('admin123', 10);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Admin', email, passwordHash, 'admin']
  );
  return result.insertId;
}

async function seedLookupTables(pool) {
  const categories = [
    ['Fiction', 'Popular fiction titles'],
    ['Business', 'Business and productivity books'],
    ['Education', 'Textbooks and learning resources']
  ];

  for (const [name, description] of categories) {
    await pool.query(
      'INSERT INTO categories (name, description) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ?)',
      [name, description, name]
    );
  }

  const suppliers = [
    ['Central Books Supply', '0300-1111111', 'Warehouse Road, Lahore', 'orders@centralbooks.test']
  ];

  for (const [name, contactNumber, address, email] of suppliers) {
    await pool.query(
      'INSERT INTO suppliers (name, contact_number, address, email) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = ?)',
      [name, contactNumber, address, email, name]
    );
  }

  const customers = [
    ['Walk-in Customer', null, null, null, 0]
  ];

  for (const [name, phone, email, address, creditBalance] of customers) {
    await pool.query(
      'INSERT INTO customers (name, phone, email, address, credit_balance) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name = ?)',
      [name, phone, email, address, creditBalance, name]
    );
  }
}

async function seedBooks(pool) {
  const samples = [
    {
      title: 'The Alchemist',
      author: 'Paulo Coelho',
      isbn: '9780061122415',
      categoryName: 'Fiction',
      publisher: 'HarperOne',
      cost_price: 750,
      sale_price: 1100,
      stock_quantity: 18,
      reorder_level: 5,
      image_url: null
    },
    {
      title: 'Atomic Habits',
      author: 'James Clear',
      isbn: '9780735211292',
      categoryName: 'Business',
      publisher: 'Avery',
      cost_price: 980,
      sale_price: 1450,
      stock_quantity: 14,
      reorder_level: 5,
      image_url: null
    },
    {
      title: 'Think and Grow Rich',
      author: 'Napoleon Hill',
      isbn: '9781585424337',
      categoryName: 'Business',
      publisher: 'TarcherPerigee',
      cost_price: 620,
      sale_price: 950,
      stock_quantity: 12,
      reorder_level: 5,
      image_url: null
    }
  ];

  for (const book of samples) {
    const categoryId = await getId(pool, 'categories', 'name', book.categoryName);
    if (!categoryId) continue;
    const [existing] = await pool.query('SELECT id FROM books WHERE isbn = ? LIMIT 1', [book.isbn]);
    if (existing.length) continue;
    await pool.query(
      `INSERT INTO books
        (title, author, isbn, category_id, publisher, cost_price, sale_price, stock_quantity, reorder_level, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        book.title,
        book.author,
        book.isbn,
        categoryId,
        book.publisher,
        book.cost_price,
        book.sale_price,
        book.stock_quantity,
        book.reorder_level,
        book.image_url
      ]
    );
  }
}

async function main() {
  await createDatabase();

  const pool = mysql.createPool(dbConfig);
  try {
    await createSchema(pool);
    await seedAdmin(pool);
    await seedLookupTables(pool);
    await seedBooks(pool);
    console.log(`Database ready: ${dbConfig.database}`);
    console.log('Seeded admin login: admin@admin.com / admin123');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exitCode = 1;
});
