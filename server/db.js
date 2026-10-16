import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  short_desc TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  compare_at_cents INTEGER CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0),
  stock INTEGER CHECK (stock IS NULL OR stock >= 0),
  sku TEXT NOT NULL DEFAULT '',
  shipping_cents INTEGER CHECK (shipping_cents IS NULL OR shipping_cents >= 0),
  legal TEXT NOT NULL DEFAULT 'keine',
  badge TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  public_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'neu',
  payment_provider TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'offen',
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL,
  zip TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  unit_price_cents INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  vehicle TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  handled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
`;

// Startwerte. Alles hier ist im Admin-Bereich änderbar.
const DEFAULT_SETTINGS = {
  shop_open: '1',
  shop_name: 'COLDSTART',
  contact_email: 'kontakt@example.com',
  shipping_default_cents: '490',
  free_shipping_from_cents: '6000',
  shipping_countries: 'DE,AT',
  delivery_time_text: 'Versand in der Regel innerhalb von 2–4 Werktagen',
  return_days: '14',
  low_stock_threshold: '5',
  payment_provider: 'manual',
  manual_payment_text:
    'Bitte überweise den Betrag innerhalb von 7 Tagen. Kontoinhaber, IBAN und BIC trägst du im Admin-Bereich unter Einstellungen ein.',
  order_seq: '0',
};

const DEFAULT_CATEGORIES = [
  ['tuning', 'Tuning-Teile', 'Kleine Upgrades für Straße und Alltag – mit ABE oder Teilegutachten.', 0],
  ['track', 'Track-Teile', 'Kompromisslos für die Rennstrecke. Nicht für den Straßenverkehr.', 1],
  ['cnc', 'CNC-Teile', 'Aus dem Vollen gefräst: Halter, Brackets und Adapter.', 2],
  ['3d-druck', '3D-Druck', 'Blenden, Clips und Halter aus technischen Kunststoffen.', 3],
  ['sticker', 'Sticker & Merch', 'Für Lack, Laptop und Werkstatt.', 4],
];

export function openDatabase(file = config.dbFile) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  seed(db);
  return db;
}

function seed(db) {
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(key, value);

  if (db.prepare('SELECT COUNT(*) AS n FROM categories').get().n === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (slug, name, description, sort) VALUES (?, ?, ?, ?)');
    for (const row of DEFAULT_CATEGORIES) insertCategory.run(...row);
  }
}

// Spaltennamen kommen aus dem Code, nie direkt von Nutzern. Werte sind immer Parameter.
export function insertRow(db, table, row) {
  const keys = Object.keys(row);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  return db.prepare(sql).run(...Object.values(row));
}

export function updateRow(db, table, id, row) {
  const keys = Object.keys(row);
  const sql = `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`;
  return db.prepare(sql).run(...Object.values(row), id);
}

// Führt fn in einer Transaktion aus. Bei Fehler wird alles zurückgerollt.
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
