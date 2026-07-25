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
      role ENUM('admin', 'manager', 'cashier', 'inventory_staff') NOT NULL DEFAULT 'cashier',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS roles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      description TEXT NULL,
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_roles_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS permissions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(120) NOT NULL,
      description TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_permissions_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id BIGINT UNSIGNED NOT NULL,
      permission_id BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      parent_id BIGINT UNSIGNED NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_categories_parent_name (parent_id, name),
      KEY idx_categories_parent_id (parent_id),
      CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
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
    `CREATE TABLE IF NOT EXISTS products (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(191) NOT NULL,
      product_code VARCHAR(80) NULL,
      barcode VARCHAR(80) NULL,
      category_id BIGINT UNSIGNED NULL,
      subcategory_id BIGINT UNSIGNED NULL,
      supplier_id BIGINT UNSIGNED NULL,
      brand VARCHAR(120) NULL,
      description TEXT NULL,
      unit VARCHAR(40) NOT NULL DEFAULT 'piece',
      image_url TEXT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      author VARCHAR(191) NULL,
      publisher VARCHAR(191) NULL,
      isbn VARCHAR(50) NULL,
      subject VARCHAR(120) NULL,
      class_level VARCHAR(80) NULL,
      edition VARCHAR(80) NULL,
      language VARCHAR(80) NULL,
      color VARCHAR(80) NULL,
      size VARCHAR(80) NULL,
      pack_quantity INT NULL,
      material VARCHAR(120) NULL,
      sport_type VARCHAR(120) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_products_code (product_code),
      UNIQUE KEY uniq_products_barcode (barcode),
      KEY idx_products_category_id (category_id),
      KEY idx_products_subcategory_id (subcategory_id),
      KEY idx_products_supplier_id (supplier_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id BIGINT UNSIGNED NOT NULL,
      variant_name VARCHAR(191) NOT NULL,
      sku VARCHAR(80) NOT NULL,
      barcode VARCHAR(80) NULL,
      purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      sale_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      stock_quantity INT NOT NULL DEFAULT 0,
      minimum_stock_level INT NOT NULL DEFAULT 0,
      attributes JSON NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_product_variants_sku (sku),
      UNIQUE KEY uniq_product_variants_barcode (barcode),
      KEY idx_product_variants_product_id (product_id),
      CONSTRAINT fk_product_variants_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE CASCADE
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_variant_id BIGINT UNSIGNED NULL,
      book_id BIGINT UNSIGNED NULL,
      movement_type ENUM('received', 'sold', 'adjusted', 'damaged', 'returned') NOT NULL,
      previous_quantity INT NOT NULL DEFAULT 0,
      quantity_change INT NOT NULL,
      new_quantity INT NOT NULL DEFAULT 0,
      reference_type VARCHAR(50) NULL,
      reference_id BIGINT UNSIGNED NULL,
      reason TEXT NULL,
      user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_stock_movements_variant_id (product_variant_id),
      KEY idx_stock_movements_book_id (book_id),
      KEY idx_stock_movements_user_id (user_id),
      CONSTRAINT fk_stock_movements_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sale_id BIGINT UNSIGNED NULL,
      purchase_id BIGINT UNSIGNED NULL,
      customer_id BIGINT UNSIGNED NULL,
      supplier_id BIGINT UNSIGNED NULL,
      direction ENUM('in', 'out') NOT NULL,
      payment_method ENUM('cash', 'card', 'bank_transfer', 'mobile_wallet', 'credit', 'split') NOT NULL DEFAULT 'cash',
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      reference_number VARCHAR(120) NULL,
      notes TEXT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_payments_sale_id (sale_id),
      KEY idx_payments_purchase_id (purchase_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS returns (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sale_id BIGINT UNSIGNED NOT NULL,
      return_number VARCHAR(80) NOT NULL,
      refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      refund_method ENUM('cash', 'card', 'bank_transfer', 'mobile_wallet', 'credit') NOT NULL DEFAULT 'cash',
      reason TEXT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
      processed_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_returns_number (return_number),
      KEY idx_returns_sale_id (sale_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS return_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      return_id BIGINT UNSIGNED NOT NULL,
      book_id BIGINT UNSIGNED NULL,
      product_variant_id BIGINT UNSIGNED NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      restock TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      KEY idx_return_items_return_id (return_id),
      CONSTRAINT fk_return_items_return
        FOREIGN KEY (return_id) REFERENCES returns (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      category VARCHAR(120) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      expense_date DATE NOT NULL,
      payment_method ENUM('cash', 'card', 'bank_transfer', 'mobile_wallet') NOT NULL DEFAULT 'cash',
      description TEXT NULL,
      user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_expenses_date (expense_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(120) NOT NULL,
      setting_value JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(80) NOT NULL,
      entity_id VARCHAR(80) NULL,
      previous_value JSON NULL,
      new_value JSON NULL,
      ip_address VARCHAR(80) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_audit_logs_user_id (user_id),
      KEY idx_audit_logs_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function columnExists(pool, table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(pool, table, column, definition) {
  if (!(await columnExists(pool, table, column))) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function migrateExistingSchema(pool) {
  await addColumnIfMissing(pool, 'categories', 'parent_id', 'BIGINT UNSIGNED NULL AFTER id');
  await addColumnIfMissing(pool, 'categories', 'status', "ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER description");
  await addColumnIfMissing(pool, 'categories', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status');
  await addColumnIfMissing(pool, 'categories', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
  await pool.query("ALTER TABLE users MODIFY role ENUM('admin', 'manager', 'cashier', 'inventory_staff') NOT NULL DEFAULT 'cashier'");
}

async function getId(pool, table, column, value) {
  const [rows] = await pool.query(`SELECT id FROM ${table} WHERE ${column} = ? LIMIT 1`, [value]);
  return rows[0]?.id ?? null;
}

async function seedRolesAndPermissions(pool) {
  const permissions = [
    ['users.manage', 'Create and manage users'],
    ['roles.manage', 'Create roles and assign permissions'],
    ['products.manage', 'Create and update products'],
    ['categories.manage', 'Create and update categories'],
    ['inventory.adjust', 'Perform manual stock adjustments'],
    ['purchases.manage', 'Record and receive purchases'],
    ['sales.create', 'Create POS sales'],
    ['sales.view_all', 'View all sales'],
    ['sales.cancel', 'Cancel completed sales'],
    ['discounts.override', 'Override discount limits'],
    ['returns.process', 'Process returns and refunds'],
    ['reports.view_profit', 'View purchase price and profit reports'],
    ['settings.manage', 'Change shop settings'],
    ['audit.view', 'View audit logs']
  ];

  for (const [code, description] of permissions) {
    await pool.query(
      'INSERT INTO permissions (code, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)',
      [code, description]
    );
  }

  const roles = [
    ['admin', 'Complete access to the system'],
    ['manager', 'Operational management and reports'],
    ['cashier', 'POS checkout and receipt handling'],
    ['inventory_staff', 'Product and stock operations']
  ];

  for (const [name, description] of roles) {
    await pool.query(
      'INSERT INTO roles (name, description, is_system) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE description = VALUES(description)',
      [name, description]
    );
  }

  const grants = {
    admin: permissions.map(([code]) => code),
    manager: [
      'products.manage',
      'categories.manage',
      'inventory.adjust',
      'purchases.manage',
      'sales.create',
      'sales.view_all',
      'discounts.override',
      'returns.process',
      'reports.view_profit'
    ],
    cashier: ['sales.create'],
    inventory_staff: ['products.manage', 'categories.manage', 'inventory.adjust', 'purchases.manage']
  };

  for (const [roleName, codes] of Object.entries(grants)) {
    const roleId = await getId(pool, 'roles', 'name', roleName);
    for (const code of codes) {
      const permissionId = await getId(pool, 'permissions', 'code', code);
      await pool.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, permissionId]
      );
    }
  }
}

async function seedAdmin(pool) {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in .env before seeding the admin user.');
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length) return existing[0].id;

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, 'admin']
  );
  return result.insertId;
}

async function ensureCategory(pool, name, description, parentId = null) {
  const [existing] = await pool.query(
    'SELECT id FROM categories WHERE name = ? AND (parent_id <=> ?) LIMIT 1',
    [name, parentId]
  );
  if (existing.length) return existing[0].id;

  const [result] = await pool.query(
    'INSERT INTO categories (parent_id, name, description, status) VALUES (?, ?, ?, "active")',
    [parentId, name, description]
  );
  return result.insertId;
}

async function seedCategoryTree(pool) {
  const tree = {
    Books: [
      'Textbooks',
      'General Books',
      'Copies or Notebooks',
      'School Class',
      'Subject',
      'Publisher',
      'Author',
      'Language',
      'Edition',
      'Nursery',
      'Prep',
      'Class 1',
      'Class 2',
      'Class 3',
      'Class 4',
      'Class 5',
      'Class 6',
      'Class 7',
      'Class 8',
      'Class 9',
      'Class 10',
      'College',
      'University'
    ],
    Stationery: [
      'Pens',
      'Pencils',
      'Markers',
      'Erasers',
      'Sharpeners',
      'Notebooks',
      'Copies',
      'Files',
      'Folders',
      'Paper',
      'Art supplies',
      'Geometry boxes',
      'School bags',
      'Office supplies'
    ],
    'Gift Items': [
      'Greeting cards',
      'Gift bags',
      'Gift boxes',
      'Toys',
      'Decorative items',
      'Keychains',
      'Mugs',
      'Photo frames'
    ],
    'Sports Items': [
      'Cricket items',
      'Football items',
      'Badminton items',
      'Table tennis items',
      'Sportswear',
      'Fitness accessories',
      'Indoor games'
    ]
  };

  for (const [parentName, children] of Object.entries(tree)) {
    const parentId = await ensureCategory(pool, parentName, `${parentName} main category`);
    for (const child of children) {
      await ensureCategory(pool, child, `${child} subcategory`, parentId);
    }
  }
}

async function seedLookupTables(pool) {
  await seedCategoryTree(pool);

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
    await migrateExistingSchema(pool);
    await seedRolesAndPermissions(pool);
    await seedAdmin(pool);
    await seedLookupTables(pool);
    await seedBooks(pool);
    console.log(`Database ready: ${dbConfig.database}`);
    console.log(`Seeded admin user: ${process.env.ADMIN_EMAIL}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exitCode = 1;
});
