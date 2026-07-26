import { pool } from '../config/db.js';

const defaults = {
  shop: {
    name: 'Bookshop',
    logo_url: '',
    address: '',
    phone: '',
    currency: 'Rs',
    date_format: 'en-PK'
  },
  receipt: {
    footer: 'Thank you for shopping with us.',
    return_policy: 'Returns accepted with original receipt.',
    format: 'thermal'
  },
  sales: {
    default_discount: 0,
    discount_type: 'fixed',
    default_tax_rate: 0,
    max_cashier_discount_percent: 5,
    allow_negative_stock: false
  },
  inventory: {
    low_stock_alert_level: 5
  },
  backup: {
    enabled: false,
    frequency: 'daily'
  },
  barcode: {
    enabled: true,
    prefix: ''
  }
};

export function defaultSettings() {
  return structuredClone(defaults);
}

export async function getSettings(conn = pool) {
  const [rows] = await conn.query('SELECT setting_key, setting_value FROM settings');
  const settings = defaultSettings();
  for (const row of rows) {
    settings[row.setting_key] = typeof row.setting_value === 'string' ? JSON.parse(row.setting_value) : row.setting_value;
  }
  return settings;
}

export async function saveSettings(settings, conn = pool) {
  for (const [key, value] of Object.entries(settings)) {
    await conn.query(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES (?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, JSON.stringify(value)]
    );
  }
}
